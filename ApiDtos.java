package com.mango.bus.dto;

import com.mango.bus.domain.BusCategory;
import com.mango.bus.domain.ReservationStatus;
import com.mango.bus.domain.SeatType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public final class ApiDtos {
    private ApiDtos() { }

    public record UserView(Long id, String username, String displayName, String role) { }

    public record LoginRequest(
            @NotBlank @Size(max = 50) String username,
            @NotBlank @Size(max = 100) String password) { }

    public record RegisterRequest(
            @NotBlank @Pattern(regexp = "[A-Za-z0-9_.-]{3,30}", message = "Use 3–30 letters, numbers, dots, dashes or underscores") String username,
            @NotBlank @Size(min = 2, max = 100) String displayName,
            @NotBlank @Size(min = 8, max = 100, message = "Password must contain at least 8 characters") String password) { }

    public record BusRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Pattern(regexp = "[A-Za-z0-9-]{2,24}", message = "Use 2–24 letters, numbers or dashes") String code,
            @NotBlank @Size(max = 80) String source,
            @NotBlank @Size(max = 80) String destination,
            @NotNull LocalTime departureTime,
            @NotNull LocalTime arrivalTime,
            @NotNull BusCategory category,
            @NotNull @DecimalMin(value = "1.00") @Digits(integer = 8, fraction = 2) BigDecimal fare,
            Boolean enabled) { }

    public record BusView(
            Long id, String name, String code, String source, String destination,
            LocalTime departureTime, LocalTime arrivalTime, BusCategory category,
            String categoryLabel, BigDecimal fare, int availableSeats, String availability,
            boolean enabled) { }

    public record SeatView(int seatNumber, String status, SeatType seatType, String deck) { }
    public record SeatMapView(Long busId, LocalDate journeyDate, List<SeatView> seats, int availableSeats, String availability) { }

    public record PassengerRequest(
            @NotNull @Min(1) @Max(37) Integer seatNumber,
            @NotBlank @Size(min = 2, max = 100) String name,
            @NotNull @Min(1) @Max(120) Integer age,
            @NotBlank String gender) { }

    public record CreateBookingRequest(
            @NotNull Long busId,
            @NotNull @FutureOrPresent LocalDate journeyDate,
            Integer seatNumber,
            List<@Valid PassengerRequest> passengers) { }

    public record BookingView(
            String bookingCode, Long busId, String busName, String busCode,
            String source, String destination, LocalTime departureTime, LocalTime arrivalTime,
            BusCategory category, String categoryLabel, LocalDate journeyDate,
            int seatNumber, SeatType seatType, BigDecimal fare, ReservationStatus status,
            String username, String displayName, Instant bookedAt,
            String passengerName, Integer passengerAge, String passengerGender,
            String groupBookingCode) { }

    public record DashboardStats(long totalRoutes, long activeRoutes, long totalUsers,
                                 long confirmedBookings, long upcomingBookings) { }

    public record MessageResponse(String message) { }
}
