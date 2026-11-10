package com.mango.bus.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "reservations", uniqueConstraints = @UniqueConstraint(name = "uk_reservation_code", columnNames = "booking_code"))
public class Reservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "booking_code", nullable = false, length = 32)
    private String bookingCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bus_id", nullable = false)
    private BusRoute bus;

    @Column(name = "journey_date", nullable = false)
    private LocalDate journeyDate;

    @Column(name = "seat_number", nullable = false)
    private int seatNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "seat_type", length = 16)
    private SeatType seatType = SeatType.SEATER;

    @Column(name = "passenger_name", length = 100)
    private String passengerName;

    @Column(name = "passenger_age")
    private Integer passengerAge;

    @Column(name = "passenger_gender", length = 10)
    private String passengerGender;

    @Column(name = "group_booking_code", length = 32)
    private String groupBookingCode;

    @Column(name = "fare_at_booking", nullable = false, precision = 10, scale = 2)
    private BigDecimal fareAtBooking;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ReservationStatus status = ReservationStatus.CONFIRMED;

    @Column(name = "booked_at", nullable = false, updatable = false)
    private Instant bookedAt = Instant.now();

    protected Reservation() {
    }

    public Reservation(String bookingCode, AppUser user, BusRoute bus, LocalDate journeyDate,
                       int seatNumber, BigDecimal fareAtBooking) {
        this(bookingCode, user, bus, journeyDate, seatNumber, fareAtBooking,
                user != null ? user.getDisplayName() : "Traveller", 25, "OTHER",
                bus != null ? SeatPolicy.getSeatType(bus.getCategory(), seatNumber) : SeatType.SEATER, null);
    }

    public Reservation(String bookingCode, AppUser user, BusRoute bus, LocalDate journeyDate,
                       int seatNumber, BigDecimal fareAtBooking,
                       String passengerName, Integer passengerAge, String passengerGender,
                       SeatType seatType, String groupBookingCode) {
        this.bookingCode = bookingCode;
        this.user = user;
        this.bus = bus;
        this.journeyDate = journeyDate;
        this.seatNumber = seatNumber;
        this.fareAtBooking = fareAtBooking;
        this.passengerName = passengerName;
        this.passengerAge = passengerAge;
        this.passengerGender = passengerGender;
        this.seatType = seatType != null ? seatType : (bus != null ? SeatPolicy.getSeatType(bus.getCategory(), seatNumber) : SeatType.SEATER);
        this.groupBookingCode = groupBookingCode;
        this.status = ReservationStatus.CONFIRMED;
        this.bookedAt = Instant.now();
    }

    public void cancel() { this.status = ReservationStatus.CANCELLED; }
    public Long getId() { return id; }
    public String getBookingCode() { return bookingCode; }
    public AppUser getUser() { return user; }
    public BusRoute getBus() { return bus; }
    public LocalDate getJourneyDate() { return journeyDate; }
    public int getSeatNumber() { return seatNumber; }
    public SeatType getSeatType() { return seatType != null ? seatType : (bus != null ? SeatPolicy.getSeatType(bus.getCategory(), seatNumber) : SeatType.SEATER); }
    public String getPassengerName() { return passengerName != null ? passengerName : (user != null ? user.getDisplayName() : "Traveller"); }
    public Integer getPassengerAge() { return passengerAge != null ? passengerAge : 25; }
    public String getPassengerGender() { return passengerGender != null ? passengerGender : "OTHER"; }
    public String getGroupBookingCode() { return groupBookingCode != null ? groupBookingCode : bookingCode; }
    public BigDecimal getFareAtBooking() { return fareAtBooking; }
    public ReservationStatus getStatus() { return status; }
    public Instant getBookedAt() { return bookedAt; }
}
