import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useUploadReceiptMutation } from '../store/api/fuelRecordApi';
import ChimpSuccessAnimation from '../components/ChimpSuccessAnimation';

export default function FuelRecordScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const navigation = useNavigation();
  
  const [uploadReceipt, { isLoading: isUploading }] = useUploadReceiptMutation();

  // Check token when component mounts
  useEffect(() => {
    const checkAuthToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('access_token');
        if (!token) {
          console.log('No auth token found - user needs to login');
          Alert.alert(
            'Authentication Required',
            'Please log in to upload receipts.',
            [{ text: 'OK', onPress: () => navigation.navigate('Profile' as never) }]
          );
        } else {
          console.log('Auth token found, length:', token.length);
        }
      } catch (error) {
        console.error('Error checking auth token:', error);
      }
    };
    
    checkAuthToken();
  }, [navigation]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const uploadReceiptImage = async () => {
    if (!selectedImage) {
      Alert.alert('No Image Selected', 'Please select an image first.');
      return;
    }

    if (isProcessing || isUploading) {
      console.log('Upload already in progress, ignoring request');
      return;
    }

    setIsProcessing(true);
    
    // Small delay to prevent duplicate requests
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // Prepare the image for upload
      const imageForUpload = {
        uri: selectedImage,
        type: 'image/jpeg',
        name: `receipt_${Date.now()}.jpg`,
      };

      console.log('Starting upload receipt request...');
      
      const result = await uploadReceipt({
        receiptImage: imageForUpload,
      }).unwrap();
      
      console.log('Upload successful! Result:', result);
      setUploadResult(result);
      
      // Show chimp success animation
      setShowSuccessAnimation(true);

    } catch (error: any) {
      console.error('Upload failed - Full error object:', error);
      console.error('Upload failed - Error status:', error.status);
      console.error('Upload failed - Error data:', error.data);
      
      let errorMessage = 'Failed to upload receipt. Please try again.';
      
      if (error.status === 403) {
        errorMessage = 'Authentication failed. Please try logging out and back in.';
      } else if (error.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.status === 413) {
        errorMessage = 'Image file is too large. Please try a smaller image.';
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      }
      
      Alert.alert(
        'Upload Failed',
        `${errorMessage}\n\nTechnical details: Status ${error.status}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Select Receipt Image',
      'Choose how you want to add your fuel receipt',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const resetForm = () => {
    setSelectedImage(null);
    setIsProcessing(false);
    setUploadResult(null);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E5E7EB', '#D1D5DB']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.title}>Upload Fuel Receipt</Text>
        <Text style={styles.subtitle}>
          Take a photo or select an image of your fuel receipt. Our system will automatically extract the fuel data.
        </Text>
      </LinearGradient>
      
      <View style={styles.content}>
        
        <TouchableOpacity 
          style={[styles.imageButton, isProcessing && styles.imageButtonProcessing]} 
          onPress={showImageOptions}
          disabled={isProcessing || isUploading}
        >
          {isProcessing || isUploading ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : (
            <Ionicons 
              name={selectedImage ? "checkmark-circle" : "camera-outline"} 
              size={48} 
              color={selectedImage ? "#4CAF50" : "#007AFF"} 
            />
          )}
          <Text style={[styles.imageButtonText, selectedImage && styles.imageButtonSelected]}>
            {isProcessing || isUploading
              ? "Processing Receipt..." 
              : selectedImage 
                ? "Receipt Image Selected" 
                : "Select Receipt Image"
            }
          </Text>
        </TouchableOpacity>

        {selectedImage && (
          <View style={styles.imagePreview}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            {uploadResult && uploadResult.ocrProcessed && (
              <View style={styles.ocrBadge}>
                <Ionicons name="checkmark-circle" size={16} color="white" />
                <Text style={styles.ocrBadgeText}>Processed</Text>
              </View>
            )}
          </View>
        )}


        
        {selectedImage && !uploadResult && (
          <TouchableOpacity 
            style={[styles.uploadButton, (isProcessing || isUploading) && styles.uploadButtonDisabled]} 
            onPress={uploadReceiptImage}
            disabled={isProcessing || isUploading}
          >
            {isUploading || isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.uploadButtonText}>Upload Receipt</Text>
            )}
          </TouchableOpacity>
        )}
        
        {!showSuccessAnimation && (
          uploadResult ? (
            <TouchableOpacity 
              style={styles.newReceiptButton} 
              onPress={resetForm}
            >
              <Text style={styles.newReceiptButtonText}>📷 Upload Another Receipt</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )
        )}
      </View>
      
      <ChimpSuccessAnimation 
        visible={showSuccessAnimation}
        onAnimationComplete={() => {
          setShowSuccessAnimation(false);
          // Navigate to Home screen instead of going back
          navigation.navigate('Home' as never);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start',
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#374151',
    lineHeight: 22,
    fontWeight: '500',
  },
  imageButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#60A5FA',
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 40,
    marginBottom: 24,
    backgroundColor: 'white',
    minHeight: 160,
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageButtonText: {
    marginTop: 12,
    fontSize: 18,
    color: '#60A5FA',
    fontWeight: '700',
    textAlign: 'center',
  },
  imageButtonSelected: {
    color: '#374151',
  },
  imageButtonProcessing: {
    opacity: 0.7,
    borderColor: '#FFA500',
    backgroundColor: '#fff9f0',
  },
  imagePreview: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  previewImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  ocrBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ocrBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  uploadButton: {
    backgroundColor: '#007AFF',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  newReceiptButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#28A745',
    marginBottom: 16,
    shadowColor: '#28A745',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  newReceiptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
