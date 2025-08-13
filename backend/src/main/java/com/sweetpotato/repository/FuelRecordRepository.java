package com.sweetpotato.repository;

import com.sweetpotato.entity.FuelRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FuelRecordRepository extends JpaRepository<FuelRecord, Long> {
    
    Page<FuelRecord> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    
    List<FuelRecord> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    @Query("SELECT SUM(fr.amount) FROM FuelRecord fr WHERE fr.user.id = :userId")
    BigDecimal getTotalAmountByUserId(@Param("userId") Long userId);
    
    @Query("SELECT SUM(fr.gallons) FROM FuelRecord fr WHERE fr.user.id = :userId")
    BigDecimal getTotalGallonsByUserId(@Param("userId") Long userId);
    
    @Query("SELECT COUNT(fr) FROM FuelRecord fr WHERE fr.user.id = :userId")
    Long getRecordCountByUserId(@Param("userId") Long userId);
    
    @Query("SELECT fr FROM FuelRecord fr WHERE fr.user.id = :userId AND fr.createdAt BETWEEN :startDate AND :endDate ORDER BY fr.createdAt DESC")
    List<FuelRecord> findByUserIdAndDateRange(@Param("userId") Long userId, 
                                              @Param("startDate") LocalDateTime startDate, 
                                              @Param("endDate") LocalDateTime endDate);
}
