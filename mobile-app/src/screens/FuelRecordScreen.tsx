import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useUploadReceiptMutation } from '../store/api/fuelRecordApi';

export default function FuelRecordScreen() {
  const [stationName, setStationName] = useState('');
  const [amount, setAmount] = useState('');
  const [gallons, setGallons] = useState('');
  const [location, setLocation] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProcessed, setOcrProcessed] = useState(false);
  const [uploadedRecordId, setUploadedRecordId] = useState<number | null>(null);
  const [isUploadComplete, setIsUploadComplete] = useState(false);
  const [hasReceivedSuccessfulResponse, setHasReceivedSuccessfulResponse] = useState(false);
  const [isUploadInProgress, setIsUploadInProgress] = useState(false);
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
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      processReceiptWithOCR(result.assets[0]);
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
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      processReceiptWithOCR(result.assets[0]);
    }
  };

  const processReceiptWithOCR = async (imageAsset: ImagePicker.ImagePickerAsset) => {
    // Prevent duplicate uploads - enhanced protection
    if (isUploadComplete || uploadedRecordId || hasReceivedSuccessfulResponse || isUploadInProgress) {
      console.log('Upload already completed, successful, or in progress - skipping duplicate request');
      return;
    }

    // Set upload in progress IMMEDIATELY to prevent duplicates
    setIsUploadInProgress(true);
    setIsProcessing(true);
    setOcrProcessed(false);

    try {
      // Prepare the image for upload
      const imageForUpload = {
        uri: imageAsset.uri,
        type: 'image/jpeg', // Expo ImagePicker typically returns JPEG
        name: `receipt_${Date.now()}.jpg`,
      };

      console.log('Starting upload receipt request...');
      
      // Debug: Check if we have a valid token
      const token = await SecureStore.getItemAsync('access_token');
      console.log('Auth token present:', token ? 'Yes' : 'No');
      console.log('Auth token length:', token ? token.length : 0);
      if (token) {
        console.log('Token starts with:', token.substring(0, 20) + '...');
        console.log('Token ends with:', '...' + token.substring(token.length - 20));
        
        // Parse JWT payload to check if token is expired
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            // Simple base64 decode for JWT payload
            const payload = JSON.parse(atob(parts[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            console.log('Token payload:', {
              subject: payload.sub,
              issuedAt: new Date(payload.iat * 1000).toISOString(),
              expiresAt: new Date(payload.exp * 1000).toISOString(),
              currentTime: new Date(currentTime * 1000).toISOString(),
              isExpired: currentTime > payload.exp
            });
          }
        } catch (error) {
          console.error('Error parsing token:', error);
        }
      }
      
      const uploadPromise = uploadReceipt({
        receiptImage: imageForUpload,
        stationName: stationName || undefined,
        location: location || undefined,
      });

      console.log('Waiting for upload response...');
      const result = await uploadPromise.unwrap();
      
      console.log('Upload successful! Result:', result);
      console.log('SUCCESS: Setting completion states to prevent any further requests');

      // Mark upload as complete to prevent duplicates - IMMEDIATE
      setUploadedRecordId(result.id);
      setIsUploadComplete(true);
      setHasReceivedSuccessfulResponse(true);
      setIsUploadInProgress(false); // Clear upload in progress
      
      console.log('SUCCESS: All states set - no more requests should be made');

      // Update form with OCR results
      if (result.ocrProcessed) {
        setOcrProcessed(true);
        if (result.stationName && !stationName) {
          setStationName(result.stationName);
        }
        if (result.amount) {
          setAmount(result.amount.toString());
        }
        if (result.gallons) {
          setGallons(result.gallons.toString());
        }
        if (result.location && !location) {
          setLocation(result.location);
        }

        Alert.alert(
          '✨ Receipt Processed!',
          'We\'ve extracted the information from your receipt. Please review and edit if needed.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Receipt Uploaded',
          'Your receipt was uploaded, but we couldn\'t extract all the information. Please fill in the details manually.',
          [{ text: 'OK' }]
        );
      }

      // Navigate back or show success
      navigation.goBack();

    } catch (error: any) {
      console.error('OCR processing failed:', error);
      
      // If we've already received a successful response, ignore subsequent errors
      // (they're likely from duplicate/retry requests)
      if (hasReceivedSuccessfulResponse) {
        console.log('Ignoring error since we already received a successful response');
        return;
      }
      
      // Check if this is a 403/429 error which might indicate the request succeeded 
      // but a duplicate was blocked (backend creates record successfully on first try)
      if (error.status === 403 || error.status === 429) {
        console.log('Received 403/429 error - checking if this might be from a duplicate request after successful upload');
        
        // Don't reset states immediately, give user option to check if record was actually created
        Alert.alert(
          'Authentication Issue',
          'There was an authentication problem. This could be because your session has expired. Please try logging out and logging back in, or check your fuel records to see if the upload succeeded.',
          [
            { text: 'Check Records', onPress: () => navigation.goBack() },
            { text: 'Retry', onPress: () => {
              // Reset states for retry
              setIsUploadComplete(false);
              setUploadedRecordId(null);
              setOcrProcessed(false);
              setHasReceivedSuccessfulResponse(false);
              setIsUploadInProgress(false);
            }},
            { text: 'Go to Profile', onPress: () => navigation.navigate('Profile' as never) }
          ]
        );
      } else {
        // Reset upload state on other errors to allow retry
        setIsUploadComplete(false);
        setUploadedRecordId(null);
        setOcrProcessed(false);
        setHasReceivedSuccessfulResponse(false);
        setIsUploadInProgress(false);
        
        Alert.alert(
          'Processing Failed',
          error.data?.message || 'Failed to process receipt. Please try again or enter details manually.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsProcessing(false);
      // Always clear upload in progress in finally block
      setIsUploadInProgress(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add a receipt image',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select a receipt image');
      return;
    }

    if (!ocrProcessed && !isUploadComplete) {
      Alert.alert(
        'Processing Required',
        'Please wait while we process your receipt.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (isUploadComplete && uploadedRecordId) {
      // Receipt already uploaded successfully
      Alert.alert(
        'Success',
        `Fuel record saved successfully! Record ID: ${uploadedRecordId}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert('Error', 'Receipt processing is not complete. Please try again.');
    }
  };

  // Reset function for uploading a new receipt
  const resetForm = () => {
    setSelectedImage(null);
    setIsProcessing(false);
    setOcrProcessed(false);
    setUploadedRecordId(null);
    setIsUploadComplete(false);
    setHasReceivedSuccessfulResponse(false);
    setIsUploadInProgress(false);
    setStationName('');
    setAmount('');
    setGallons('');
    setLocation('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <Text style={styles.title}>Add Fuel Record</Text>
          
          <TouchableOpacity 
            style={[styles.imageButton, isProcessing && styles.imageButtonProcessing]} 
            onPress={showImageOptions}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Ionicons 
                name={selectedImage ? "checkmark-circle" : "camera-outline"} 
                size={24} 
                color={selectedImage ? "#4CAF50" : "#007AFF"} 
              />
            )}
            <Text style={[styles.imageButtonText, selectedImage && styles.imageButtonSelected]}>
              {isProcessing 
                ? "Processing Receipt..." 
                : selectedImage 
                  ? "Receipt Image Selected" 
                  : "Add Receipt Image"
              }
            </Text>
          </TouchableOpacity>

          {selectedImage && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              {ocrProcessed && (
                <View style={styles.ocrBadge}>
                  <Ionicons name="sparkles" size={16} color="#4CAF50" />
                  <Text style={styles.ocrBadgeText}>OCR Processed</Text>
                </View>
              )}
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Gas Station Name"
            value={stationName}
            onChangeText={setStationName}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Total Amount ($)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Gallons"
            value={gallons}
            onChangeText={setGallons}
            keyboardType="decimal-pad"
          />

          <TextInput
            style={styles.input}
            placeholder="Location (Optional)"
            value={location}
            onChangeText={setLocation}
          />
          
          <TouchableOpacity 
            style={[styles.saveButton, (isProcessing || isUploading) && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={isProcessing || isUploading}
          >
            {isUploading || isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isUploadComplete ? "✅ Record Saved!" : (ocrProcessed ? "Complete Upload" : "Process Receipt")}
              </Text>
            )}
          </TouchableOpacity>
          
          {isUploadComplete ? (
            <TouchableOpacity 
              style={styles.newReceiptButton} 
              onPress={resetForm}
            >
              <Text style={styles.newReceiptButtonText}>📷 New Receipt</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  form: {
    margin: 20,
    padding: 30,
    backgroundColor: 'white',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  imageButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  imageButtonSelected: {
    color: '#4CAF50',
  },
  imageButtonProcessing: {
    opacity: 0.7,
    borderColor: '#FFA500',
  },
  imagePreview: {
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  ocrBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ocrBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  newReceiptButton: {
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#28A745',
    marginTop: 10,
    shadowColor: '#28A745',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  newReceiptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
