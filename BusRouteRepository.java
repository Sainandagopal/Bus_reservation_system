package com.mango.bus.repository;

import com.mango.bus.domain.BusRoute;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface BusRouteRepository extends JpaRepository<BusRoute, Long> {
    boolean existsByCodeIgnoreCase(String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from BusRoute b where b.id = :id")
    Optional<BusRoute> findByIdForUpdate(@Param("id") Long id);
}
