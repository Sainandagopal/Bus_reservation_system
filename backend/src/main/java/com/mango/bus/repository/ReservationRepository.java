package com.mango.bus.repository;

import com.mango.bus.domain.Reservation;
import com.mango.bus.domain.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByUserUsernameOrderByBookedAtDesc(String username);
    List<Reservation> findAllByOrderByBookedAtDesc();
    List<Reservation> findByBusIdAndJourneyDateAndStatus(Long busId, LocalDate journeyDate, ReservationStatus status);
    boolean existsByBusIdAndJourneyDateAndSeatNumberAndStatus(Long busId, LocalDate journeyDate, int seatNumber, ReservationStatus status);
    boolean existsByBusIdAndStatus(Long busId, ReservationStatus status);
    boolean existsByBusIdAndStatusAndJourneyDateGreaterThanEqual(Long busId, ReservationStatus status, LocalDate journeyDate);
    Optional<Reservation> findByBookingCode(String bookingCode);
    Optional<Reservation> findByBookingCodeAndUserUsername(String bookingCode, String username);
    long countByStatus(ReservationStatus status);
    long countByStatusAndJourneyDateGreaterThanEqual(ReservationStatus status, LocalDate journeyDate);
}
