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

  const renderFuelRecord = ({ item }: { item: FuelReceiptResponse }) => (
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fuel Records</Text>
        <Text style={styles.headerSubtitle}>
          {fuelRecords?.totalElements || 0} total records
        </Text>
      </View>

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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  recordCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recordInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 14,
    color: '#666',
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
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
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
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
