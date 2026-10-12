package com.mango.bus.service;

import com.mango.bus.domain.*;
import com.mango.bus.dto.ApiDtos.BookingView;
import com.mango.bus.dto.ApiDtos.CreateBookingRequest;
import com.mango.bus.dto.ApiDtos.PassengerRequest;
import com.mango.bus.repository.AppUserRepository;
import com.mango.bus.repository.BusRouteRepository;
import com.mango.bus.repository.ReservationRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class ReservationService {
    private final ReservationRepository reservations;
    private final AppUserRepository users;
    private final BusRouteRepository buses;

    public ReservationService(ReservationRepository reservations, AppUserRepository users, BusRouteRepository buses) {
        this.reservations = reservations;
        this.users = users;
        this.buses = buses;
    }

    @Transactional
    public List<BookingView> book(String username, CreateBookingRequest request) {
        if (request.journeyDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Journey date cannot be in the past.");
        }

        List<PassengerRequest> passengerList = request.passengers();
        if (passengerList == null || passengerList.isEmpty()) {
            if (request.seatNumber() == null) {
                throw new IllegalArgumentException("Please select at least one seat and provide passenger details.");
            }
            AppUser user = users.findByUsername(username)
                    .orElseThrow(() -> new EntityNotFoundException("User account was not found."));
            passengerList = List.of(new PassengerRequest(request.seatNumber(), user.getDisplayName(), 25, "OTHER"));
        }

        if (passengerList.size() > SeatPolicy.MAX_SEATS_PER_BOOKING) {
            throw new IllegalArgumentException("You can choose up to " + SeatPolicy.MAX_SEATS_PER_BOOKING + " seats for booking.");
        }

        java.util.Set<Integer> uniqueSeats = new java.util.HashSet<>();
        for (PassengerRequest p : passengerList) {
            if (p.seatNumber() == null || !SeatPolicy.isValidSeatNumber(p.seatNumber())) {
                throw new IllegalArgumentException("The selected seat is not valid.");
            }
            if (!uniqueSeats.add(p.seatNumber())) {
                throw new IllegalArgumentException("Duplicate seat " + p.seatNumber() + " selected. Please select distinct seats.");
            }
            if (p.name() == null || p.name().trim().length() < 2) {
                throw new IllegalArgumentException("Please enter a valid passenger name (at least 2 letters) for seat " + p.seatNumber() + ".");
            }
            if (p.age() == null || p.age() < 1 || p.age() > 120) {
                throw new IllegalArgumentException("Please enter a valid passenger age (1-120) for seat " + p.seatNumber() + ".");
            }
        }

        // Lock the bus row so two simultaneous requests cannot confirm the same seat.
        BusRoute bus = buses.findByIdForUpdate(request.busId())
                .orElseThrow(() -> new EntityNotFoundException("Bus route was not found."));
        if (!bus.isEnabled()) throw new IllegalArgumentException("This route is not accepting bookings.");

        for (Integer seatNo : uniqueSeats) {
            boolean taken = reservations.existsByBusIdAndJourneyDateAndSeatNumberAndStatus(
                    bus.getId(), request.journeyDate(), seatNo, ReservationStatus.CONFIRMED);
            if (taken) {
                throw new IllegalArgumentException("Seat " + seatNo + " has just been booked. Please select another seat.");
            }
        }

        AppUser user = users.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User account was not found."));
        String groupCode = "GRP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);

        List<BookingView> result = new java.util.ArrayList<>(passengerList.size());
        for (PassengerRequest p : passengerList) {
            String code = "MNG-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase(Locale.ROOT);
            SeatType seatType = SeatPolicy.getSeatType(bus.getCategory(), p.seatNumber());
            Reservation reservation = new Reservation(
                    code, user, bus, request.journeyDate(), p.seatNumber(), bus.getFare(),
                    p.name().trim(), p.age(), p.gender() != null ? p.gender().trim().toUpperCase(Locale.ROOT) : "OTHER",
                    seatType, groupCode);
            result.add(toView(reservations.save(reservation)));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<BookingView> ownBookings(String username) {
        return reservations.findByUserUsernameOrderByBookedAtDesc(username).stream().map(this::toView).toList();
    }

    @Transactional(readOnly = true)
    public List<BookingView> allBookings() {
        return reservations.findAllByOrderByBookedAtDesc().stream().map(this::toView).toList();
    }

    @Transactional
    public BookingView cancelOwn(String bookingCode, String username) {
        Reservation reservation = reservations.findByBookingCodeAndUserUsername(bookingCode, username)
                .orElseThrow(() -> new EntityNotFoundException("Your booking was not found."));
        cancel(reservation);
        return toView(reservation);
    }

    @Transactional
    public BookingView cancelForAdmin(String bookingCode) {
        Reservation reservation = reservations.findByBookingCode(bookingCode)
                .orElseThrow(() -> new EntityNotFoundException("Booking was not found."));
        cancel(reservation);
        return toView(reservation);
    }

    @Transactional
    public void cancel(Reservation reservation) {
        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new IllegalArgumentException("This booking is already cancelled.");
        }
        if (reservation.getJourneyDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Past journeys cannot be cancelled.");
        }
        reservation.cancel();
    }

    private BookingView toView(Reservation reservation) {
        BusRoute bus = reservation.getBus();
        AppUser user = reservation.getUser();
        return new BookingView(reservation.getBookingCode(), bus.getId(), bus.getName(), bus.getCode(),
                bus.getSource(), bus.getDestination(), bus.getDepartureTime(), bus.getArrivalTime(),
                bus.getCategory(), bus.getCategory().getLabel(), reservation.getJourneyDate(),
                reservation.getSeatNumber(), reservation.getSeatType(), reservation.getFareAtBooking(),
                reservation.getStatus(), user.getUsername(), user.getDisplayName(), reservation.getBookedAt(),
                reservation.getPassengerName(), reservation.getPassengerAge(), reservation.getPassengerGender(),
                reservation.getGroupBookingCode());
    }
}
