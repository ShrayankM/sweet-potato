import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { AppStackParamList } from '../navigation/AppNavigator';
import { useGetFuelRecordByIdQuery } from '../store/api/fuelRecordApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type FuelRecordDetailScreenNavigationProp = NativeStackNavigationProp<AppStackParamList, 'FuelRecordDetail'>;
type FuelRecordDetailScreenRouteProp = RouteProp<AppStackParamList, 'FuelRecordDetail'>;

const { width } = Dimensions.get('window');

export default function FuelRecordDetailScreen() {
  const navigation = useNavigation<FuelRecordDetailScreenNavigationProp>();
  const route = useRoute<FuelRecordDetailScreenRouteProp>();
  const { recordId } = route.params;

  const { 
    data: fuelRecord, 
    error, 
    isLoading 
  } = useGetFuelRecordByIdQuery(recordId);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getFuelTypeColors = (fuelType: string) => {
    switch (fuelType?.toLowerCase()) {
      case 'petrol':
        return { backgroundColor: '#FFEBEE', textColor: '#D32F2F' }; // Red
      case 'diesel':
        return { backgroundColor: '#FFF9C4', textColor: '#F57F17' }; // Yellow
      case 'cng':
        return { backgroundColor: '#E8F5E8', textColor: '#388E3C' }; // Green
      case 'lpg':
        return { backgroundColor: '#E3F2FD', textColor: '#1976D2' }; // Blue
      default:
        return { backgroundColor: '#F5F5F5', textColor: '#757575' }; // Gray for unknown
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading fuel record details...</Text>
      </View>
    );
  }

  if (error || !fuelRecord) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>Failed to load fuel record</Text>
        <Text style={styles.errorSubText}>The record might have been deleted or doesn't exist</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fuelTypeColors = getFuelTypeColors(fuelRecord.fuelType || '');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <LinearGradient
        colors={['#E5E7EB', '#D1D5DB']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.stationInfo}>
            {fuelRecord.brandLogoUrl && (
              <Image
                source={{ uri: fuelRecord.brandLogoUrl }}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            )}
            <View style={styles.stationDetails}>
              <Text style={styles.stationName}>
                {fuelRecord.stationName || fuelRecord.stationBrand || 'Gas Station'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Main Details */}
      <View style={styles.detailsContainer}>
        {/* Amount Card */}
        <LinearGradient
          colors={['#D1FAE5', '#A7F3D0']}
          style={styles.amountCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amount}>₹{(fuelRecord.amount || 0).toFixed(2)}</Text>
        </LinearGradient>

        {/* Fuel Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailCard}>
            <Ionicons name="speedometer-outline" size={24} color="#007AFF" />
            <Text style={styles.detailLabel}>Fuel Type</Text>
            {fuelRecord.fuelType && (
              <Text style={[
                styles.fuelType,
                { 
                  backgroundColor: fuelTypeColors.backgroundColor, 
                  color: fuelTypeColors.textColor 
                }
              ]}>
                {fuelRecord.fuelType}
              </Text>
            )}
          </View>

          <View style={styles.detailCard}>
            <Ionicons name="water-outline" size={24} color="#007AFF" />
            <Text style={styles.detailLabel}>Liters</Text>
            <Text style={styles.detailValue}>
              {(fuelRecord.liters || 0).toFixed(1)}L
            </Text>
          </View>

          <View style={styles.detailCard}>
            <Ionicons name="calculator-outline" size={24} color="#007AFF" />
            <Text style={styles.detailLabel}>Price/Liter</Text>
            <Text style={styles.detailValue}>
              ₹{(fuelRecord.pricePerLiter || 0).toFixed(2)}
            </Text>
          </View>

          <View style={styles.detailCard}>
            <Ionicons name="calendar-outline" size={24} color="#007AFF" />
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>
              {formatDate(fuelRecord.purchaseDate || fuelRecord.createdAt)}
            </Text>
          </View>
        </View>

        {/* Location Section */}
        {fuelRecord.location && (
          <View style={styles.locationSection}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationCard}>
              <Ionicons name="location-outline" size={24} color="#007AFF" />
              <Text style={styles.locationText}>{fuelRecord.location}</Text>
            </View>
          </View>
        )}

        {/* OCR Details */}
        {fuelRecord.ocrProcessed && (
          <View style={styles.ocrSection}>
            <Text style={styles.sectionTitle}>OCR Processing</Text>
            <View style={styles.ocrDetails}>
              <View style={styles.ocrItem}>
                <Ionicons name="checkmark-circle" size={20} color="#28A745" />
                <Text style={styles.ocrText}>Receipt processed successfully</Text>
              </View>
              {fuelRecord.ocrConfidence && (
                <View style={styles.ocrItem}>
                  <Ionicons name="analytics-outline" size={20} color="#007AFF" />
                  <Text style={styles.ocrText}>
                    Confidence: {fuelRecord.ocrConfidence}%
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8faff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8faff',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    textAlign: 'center',
  },
  errorSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 12,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  brandLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  stationDetails: {
    flex: 1,
  },
  stationName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  location: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  detailsContainer: {
    padding: 20,
  },
  amountCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  amountLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 8,
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  detailCard: {
    width: (width - 60) / 2,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 100,
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  fuelType: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '500',
    overflow: 'hidden',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  locationSection: {
    marginBottom: 24,
  },
  locationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  locationText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  ocrSection: {
    marginBottom: 24,
  },
  ocrDetails: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  ocrItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ocrText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
});
