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
import { LinearGradient } from 'expo-linear-gradient';
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
  } = useGetFuelRecordsQuery({ page: 0, size: 100 });

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

  // Helper function to format user name
  const formatUserName = (name: string | undefined) => {
    if (!name) return 'User';
    // Capitalize first letter of each word
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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
        {/* Station Brand Image Placeholder */}
        <View style={styles.stationImagePlaceholder}>
          <Ionicons name="business-outline" size={24} color="#9CA3AF" />
        </View>
        
        {/* Record Content */}
        <View style={styles.recordContent}>
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
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hello, {formatUserName(user?.userName)}!</Text>
            <Text style={styles.subtitle}>Track your fuel expenses</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-circle-outline" size={32} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <LinearGradient
          colors={['#DBEAFE', '#BFDBFE']}
          style={[styles.statCard, styles.recordsCard]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="document-text-outline" size={24} color="#1F2937" />
          <Text style={styles.statNumber}>{stats.records}</Text>
          <Text style={styles.statLabel}>Records</Text>
        </LinearGradient>
        <LinearGradient
          colors={['#D1FAE5', '#A7F3D0']}
          style={[styles.statCard, styles.spentCard]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="wallet-outline" size={24} color="#1F2937" />
          <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit={true}>₹{stats.totalSpent.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total Spent</Text>
        </LinearGradient>
        <LinearGradient
          colors={['#FEF3C7', '#FDE68A']}
          style={[styles.statCard, styles.litersCard]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="speedometer-outline" size={24} color="#1F2937" />
          <Text style={styles.statNumber}>{stats.totalLiters.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Total Liters</Text>
        </LinearGradient>
      </View>

      {/* Upload Receipt Button */}
      <View style={styles.uploadSection}>
        <TouchableOpacity 
          style={styles.uploadReceiptButton}
          onPress={() => navigation.navigate('FuelRecord')}
        >
          <LinearGradient
            colors={['#60A5FA', '#3B82F6']}
            style={styles.uploadReceiptGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="camera" size={24} color="white" />
            <Text style={styles.uploadReceiptText}>Upload Fuel Receipt</Text>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.recordsSection}>
        <Text style={styles.sectionTitle}>Fuel Records</Text>
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
            <TouchableOpacity 
              style={styles.emptyUploadButton}
              onPress={() => navigation.navigate('FuelRecord')}
            >
              <Text style={styles.emptyUploadButtonText}>📸 Upload Receipt</Text>
            </TouchableOpacity>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#374151',
    marginTop: 5,
    fontWeight: '500',
  },
  profileButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 25,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginTop: -20,
  },
  statCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 110,
    justifyContent: 'center',
  },
  recordsCard: {
    // Red gradient card styles
  },
  spentCard: {
    // Green gradient card styles
  },
  litersCard: {
    // Yellow gradient card styles
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 8,
    minWidth: 50,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#374151',
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  recordsSection: {
    flex: 1,
    padding: 20,
    paddingTop: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'left',
  },
  recordCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#6B7280',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stationImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordContent: {
    flex: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  recordDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  date: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  liters: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  fuelTypeContainer: {
    marginTop: 4,
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
  uploadSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 5,
  },
  uploadReceiptButton: {
    shadowColor: '#60A5FB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  uploadReceiptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  uploadReceiptText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 12,
    flex: 1,
    textAlign: 'center',
  },
  emptyUploadButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#60A5FA',
    borderRadius: 12,
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyUploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
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
    color: '#7f8c8d',
    textAlign: 'center',
    fontWeight: '500',
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
    fontWeight: '700',
    color: '#e74c3c',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6B7280',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
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
    fontWeight: '700',
    color: '#7f8c8d',
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
