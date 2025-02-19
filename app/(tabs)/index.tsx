import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Canvas, { CanvasRef } from '../../components/Canvas';
import * as ImagePicker from 'expo-image-picker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function DrawScreen() {
  const [selectedTool, setSelectedTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const canvasRef = useRef<CanvasRef>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      canvasRef.current?.setBackgroundImage(result.assets[0].uri);
    }
  };

  const handleToolChange = (tool: 'pen' | 'highlighter' | 'eraser') => {
    setSelectedTool(tool);
    canvasRef.current?.setTool(tool);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.tool, selectedTool === 'pen' && styles.selectedTool]}
          onPress={() => handleToolChange('pen')}
        >
          <Ionicons name="pencil" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tool, selectedTool === 'highlighter' && styles.selectedTool]}
          onPress={() => handleToolChange('highlighter')}
        >
          <Ionicons name="color-wand" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tool, selectedTool === 'eraser' && styles.selectedTool]}
          onPress={() => handleToolChange('eraser')}
        >
          <Ionicons name="trash" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tool} onPress={pickImage}>
          <Ionicons name="image" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tool} 
          onPress={() => canvasRef.current?.undo()}
        >
          <Ionicons name="arrow-undo" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tool} 
          onPress={() => canvasRef.current?.redo()}
        >
          <Ionicons name="arrow-redo" size={24} color="black" />
        </TouchableOpacity>
      </View>
      <Canvas ref={canvasRef} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  toolbar: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tool: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    borderRadius: 20,
  },
  selectedTool: {
    backgroundColor: '#e0e0e0',
  },
});