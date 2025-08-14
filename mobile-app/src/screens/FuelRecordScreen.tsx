import React, { useState } from 'react';
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
import { useUploadReceiptMutation } from '../store/api/fuelRecordApi';

export default function FuelRecordScreen() {
  const [stationName, setStationName] = useState('');
  const [amount, setAmount] = useState('');
  const [gallons, setGallons] = useState('');
  const [location, setLocation] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProcessed, setOcrProcessed] = useState(false);
  const navigation = useNavigation();
  
  const [uploadReceipt, { isLoading: isUploading }] = useUploadReceiptMutation();

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
    setIsProcessing(true);
    setOcrProcessed(false);

    try {
      // Prepare the image for upload
      const imageForUpload = {
        uri: imageAsset.uri,
        type: 'image/jpeg', // Expo ImagePicker typically returns JPEG
        name: `receipt_${Date.now()}.jpg`,
      };

      const result = await uploadReceipt({
        receiptImage: imageForUpload,
        stationName: stationName || undefined,
        location: location || undefined,
      }).unwrap();

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
      Alert.alert(
        'Processing Failed',
        error.data?.message || 'Failed to process receipt. Please try again or enter details manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
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

    if (!stationName || !amount || !gallons) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // If we haven't processed with OCR yet, do it now
    if (!ocrProcessed && selectedImage) {
      Alert.alert(
        'Processing Required',
        'Please wait while we process your receipt.',
        [{ text: 'OK' }]
      );
      return;
    }

    // If we get here, the receipt was already processed via OCR
    // The user might have made manual adjustments
    Alert.alert(
      'Success',
      'Fuel record saved successfully!',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
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
            {isUploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>
                {ocrProcessed ? "Record Saved" : "Save Record"}
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
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
});
