import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { AppStackParamList } from '../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useGetFuelRecordsQuery } from '../store/api/fuelRecordApi';

type HomeScreenNavigationProp = NativeStackNavigationProp<AppStackParamList, 'Home'>;

export default function HomeScreen() {
  const { user } = useAppSelector(state => state.auth);
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useAppDispatch();
  
  // Fetch fuel records using RTK Query
  const { 
    data: fuelRecordsData, 
    error, 
    isLoading, 
    refetch,
    isFetching,
    status 
  } = useGetFuelRecordsQuery({ page: 0, size: 10 });

  // Debug logging and error handling
  React.useEffect(() => {
    console.log('HomeScreen - Query status:', { 
      status, 
      isLoading, 
      isFetching, 
      hasData: !!fuelRecordsData, 
      hasError: !!error 
    });
    
    if (error) {
      console.error('HomeScreen - Query error:', error);
      
      // Check if it's an authentication error
      if ('status' in error && (error.status === 401 || error.status === 403)) {
        console.log('HomeScreen - Authentication error detected, logging out user');
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
    }
  }, [status, isLoading, isFetching, fuelRecordsData, error, dispatch]);

  const fuelRecords = fuelRecordsData?.content || [];
  
  // Calculate stats from real data
  const stats = React.useMemo(() => {
    const totalRecords = fuelRecordsData?.totalElements || 0;
    const totalAmount = fuelRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
    const totalLiters = fuelRecords.reduce((sum, record) => sum + (record.liters || 0), 0);
    
    return {
      records: totalRecords,
      totalSpent: totalAmount,
      totalLiters: totalLiters,
    };
  }, [fuelRecords, fuelRecordsData?.totalElements]);

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

  const renderFuelRecord = ({ item }: { item: any }) => {
    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
      } catch {
        return dateString;
      }
    };

    const fuelTypeColors = getFuelTypeColors(item.fuelType);

    return (
      <View style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <Text style={styles.stationName}>
            {item.stationBrand || 'Gas Station'}
          </Text>
          <Text style={styles.amount}>
            ₹{(item.amount || 0).toFixed(2)}
          </Text>
        </View>
        <View style={styles.recordDetails}>
          <Text style={styles.date}>
            {item.purchaseDate ? formatDate(item.purchaseDate) : formatDate(item.createdAt)}
          </Text>
          <Text style={styles.liters}>
            {(item.liters || 0).toFixed(1)} liters
          </Text>
        </View>
        {item.fuelType && (
          <View style={styles.fuelTypeContainer}>
            <Text style={[
              styles.fuelType,
              { 
                backgroundColor: fuelTypeColors.backgroundColor, 
                color: fuelTypeColors.textColor 
              }
            ]}>
              {item.fuelType}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.userName}!</Text>
          <Text style={styles.subtitle}>Track your fuel expenses</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-circle-outline" size={32} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.records}</Text>
          <Text style={styles.statLabel}>Records</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>₹{stats.totalSpent.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total Spent</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalLiters.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Total Liters</Text>
        </View>
      </View>

      <View style={styles.recordsSection}>
        <Text style={styles.sectionTitle}>Recent Records</Text>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading your fuel records...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
            <Text style={styles.errorText}>Failed to load fuel records</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => refetch()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : fuelRecords.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#8E8E93" />
            <Text style={styles.emptyText}>No fuel records yet</Text>
            <Text style={styles.emptySubText}>Start by uploading your first receipt</Text>
          </View>
        ) : (
          <FlatList
            data={fuelRecords}
            renderItem={renderFuelRecord}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            onRefresh={refetch}
            refreshing={isLoading}
          />
        )}
      </View>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('FuelRecord')}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    paddingTop: 60,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  profileButton: {
    padding: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  recordsSection: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  recordCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  recordDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  liters: {
    fontSize: 14,
    color: '#666',
  },
  fuelTypeContainer: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  fuelType: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '500',
    overflow: 'hidden',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
