import React, {
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import { View, StyleSheet, Dimensions, Image, Platform } from 'react-native';
import Svg, { Path as SvgPath, G } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Point = { x: number; y: number };
type DrawPath = {
  points: Point[];
  color: string;
  width: number;
  type: 'pen' | 'highlighter' | 'eraser';
};

export type CanvasRef = {
  undo: () => void;
  redo: () => void;
  setTool: (tool: 'pen' | 'highlighter' | 'eraser') => void;
  setBackgroundImage: (uri: string | null) => void;
};

const Canvas = forwardRef<CanvasRef>((_, ref) => {
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawPath | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const undoStack = useRef<DrawPath[]>([]);
  const redoStack = useRef<DrawPath[]>([]);
  const svgRef = useRef<View>(null);
  const isDrawing = useRef(false);
  const isPinching = useRef(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    undo: () => {
      if (paths.length > 0) {
        const newPaths = [...paths];
        const removedPath = newPaths.pop();
        if (removedPath) {
          undoStack.current.push(removedPath);
          setPaths(newPaths);
        }
      }
    },
    redo: () => {
      if (undoStack.current.length > 0) {
        const pathToRestore = undoStack.current.pop();
        if (pathToRestore) {
          setPaths((prev) => [...prev, pathToRestore]);
        }
      }
    },
    setTool,
    setBackgroundImage,
  }));

  const getCoordinates = useCallback(
    (x: number, y: number): Point => {
      const point = { x, y };
      if (Platform.OS === 'web') {
        const element = svgRef.current;
        if (element) {
          try {
            // @ts-ignore
            const rect = element.getBoundingClientRect?.();
            if (rect) {
              point.x = Math.max(
                0,
                Math.min(
                  (x - rect.left - translateX.value) / scale.value,
                  SCREEN_WIDTH
                )
              );
              point.y = Math.max(
                0,
                Math.min(
                  (y - rect.top - translateY.value) / scale.value,
                  SCREEN_HEIGHT
                )
              );
            }
          } catch (error) {
            console.error('Error getting coordinates:', error);
          }
        }
      }
      return point;
    },
    [scale.value, translateX.value, translateY.value]
  );

  const drawGesture = Gesture.Pan()
    .minDistance(1)
    .maxPointers(1)
    .onStart((event) => {
      if (isPinching.current) return;
      isDrawing.current = true;

      const point = getCoordinates(event.x, event.y);
      const newPath = {
        points: [point],
        color:
          tool === 'highlighter'
            ? 'rgba(255, 255, 0, 0.5)'
            : tool === 'eraser'
            ? 'white'
            : 'black',
        width: tool === 'highlighter' ? 20 : tool === 'eraser' ? 30 : 2,
        type: tool,
      };
      setCurrentPath(newPath);
    })
    .onUpdate((event) => {
      if (!isDrawing.current || !currentPath || isPinching.current) return;

      const point = getCoordinates(event.x, event.y);
      setCurrentPath((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          points: [...prev.points, point],
        };
      });
    })
    .onEnd(() => {
      if (!isDrawing.current || !currentPath) return;

      setPaths((prev) => [...prev, currentPath]);
      setCurrentPath(null);
      isDrawing.current = false;
      redoStack.current = [];
    })
    .onFinalize(() => {
      isDrawing.current = false;
      setCurrentPath(null);
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      isPinching.current = true;
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.min(Math.max(savedScale.value * event.scale, 0.5), 3);
    })
    .onEnd(() => {
      isPinching.current = false;
    });

  const panGesture = Gesture.Pan()
    .minPointers(2)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      const maxTranslateX = ((scale.value - 1) * SCREEN_WIDTH) / 2;
      const maxTranslateY = ((scale.value - 1) * SCREEN_HEIGHT) / 2;

      translateX.value = withSpring(
        Math.min(Math.max(translateX.value, -maxTranslateX), maxTranslateX)
      );
      translateY.value = withSpring(
        Math.min(Math.max(translateY.value, -maxTranslateY), maxTranslateY)
      );
    });

  const composedGesture = Gesture.Simultaneous(
    Gesture.Race(panGesture, drawGesture),
    pinchGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const renderPath = useCallback(
    (path: DrawPath) => {
      if (!path?.points?.length) return null;

      const d = path.points.reduce((acc, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        return `${acc} L ${point.x} ${point.y}`;
      }, '');

      return (
        <SvgPath
          d={d}
          stroke={path.color}
          strokeWidth={path.width / scale.value}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    },
    [scale.value]
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          {backgroundImage && (
            <Image
              source={{ uri: backgroundImage }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
          )}
          <Svg
            ref={svgRef}
            height={SCREEN_HEIGHT}
            width={SCREEN_WIDTH}
            style={StyleSheet.absoluteFill}
          >
            <G>
              {paths.map((path, index) => (
                <React.Fragment key={index}>{renderPath(path)}</React.Fragment>
              ))}
              {currentPath && renderPath(currentPath)}
            </G>
          </Svg>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
});

export default Canvas;
