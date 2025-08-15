import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { useGetFuelRecordsQuery, useDeleteFuelRecordMutation, FuelReceiptResponse } from '../store/api/fuelRecordApi';

export default function FuelHistoryScreen() {
  const dispatch = useAppDispatch();
  const { data: fuelRecords, isLoading, error, refetch } = useGetFuelRecordsQuery({ page: 0, size: 50 });
  const [deleteRecord] = useDeleteFuelRecordMutation();

  // Handle authentication errors
  React.useEffect(() => {
    if (error && 'status' in error && (error.status === 401 || error.status === 403)) {
      console.log('FuelHistoryScreen - Authentication error detected, logging out user');
      Alert.alert(
        'Session Expired', 
        'Please log in again to continue.',
        [
          {
            text: 'OK',
            onPress: () => dispatch(logout())
          }
        ]
      );
    }
  }, [error, dispatch]);

  const handleDeleteRecord = (record: FuelReceiptResponse) => {
    Alert.alert(
      'Delete Record',
      `Are you sure you want to delete the record for ${record.stationName || 'Unknown Station'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecord(record.id).unwrap();
              Alert.alert('Success', 'Record deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete record');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount?: number) => {
    return amount ? `₹${amount.toFixed(2)}` : 'N/A';
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

  const renderFuelRecord = ({ item }: { item: FuelReceiptResponse }) => {
    // Debug: Log fuel record data
    console.log('🔍 Fuel Record Debug:', {
      id: item.id, 
      stationName: item.stationName,
      brandLogoUrl: item.brandLogoUrl,
      hasBrandLogoUrl: !!item.brandLogoUrl
    });
    
    return (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.recordInfo}>
          <Text style={styles.stationName}>
            {item.stationName || 'Unknown Station'}
          </Text>
          <Text style={styles.recordDate}>
            {item.purchaseDate ? formatDate(item.purchaseDate) : formatDate(item.createdAt)}
          </Text>
        </View>
        <View style={styles.recordActions}>
          {item.ocrProcessed && (
            <View style={styles.ocrBadge}>
              <Ionicons name="sparkles" size={12} color="#4CAF50" />
            </View>
          )}
          <TouchableOpacity
            onPress={() => handleDeleteRecord(item)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.recordDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={styles.detailValue}>{formatCurrency(item.amount)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Liters:</Text>
          <Text style={styles.detailValue}>
            {item.liters ? `${item.liters.toFixed(3)}` : 'N/A'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price/Liter:</Text>
          <Text style={styles.detailValue}>
            {item.pricePerLiter ? formatCurrency(item.pricePerLiter) : 'N/A'}
          </Text>
        </View>
        {item.fuelType && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fuel Type:</Text>
            <View style={styles.fuelTypeContainer}>
              <Text style={[
                styles.fuelTypeChip,
                getFuelTypeColors(item.fuelType)
              ]}>
                {item.fuelType}
              </Text>
            </View>
          </View>
        )}
        {item.location && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        )}
      </View>

      {item.receiptImageUrl && (
        <TouchableOpacity
          style={styles.imagePreview}
          onPress={() => {
            Alert.alert('Receipt Image', 'Full image viewer coming soon!');
          }}
        >
          <Image source={{ uri: item.receiptImageUrl }} style={styles.receiptImage} />
          <View style={styles.imageOverlay}>
            <Ionicons name="eye-outline" size={20} color="white" />
            <Text style={styles.imageOverlayText}>View Receipt</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E5E7EB', '#D1D5DB']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>Fuel Records</Text>
        <Text style={styles.headerSubtitle}>
          {fuelRecords?.totalElements || 0} total records
        </Text>
      </LinearGradient>

      <FlatList
        data={fuelRecords?.content || []}
        renderItem={renderFuelRecord}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>No Fuel Records Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start by adding a fuel receipt to track your expenses
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rer: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#374151',
    marginTop: 8,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  recordCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#6B7280',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#60A5FA',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recordInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 2,
  },
  recordDate: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  recordActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ocrBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 6,
    marginRight: 8,
  },
  deleteButton: {
    padding: 6,
  },
  recordDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  detailLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    flex: 1,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
    textAlign: 'right',
  },
  imagePreview: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  receiptImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  imageOverlayText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  fuelTypeContainer: {
    alignItems: 'flex-end',
    flex: 1,
  },
  fuelTypeChip: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
