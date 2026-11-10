package com.mango.bus.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalTime;

@Entity
@Table(name = "bus_routes", uniqueConstraints = @UniqueConstraint(name = "uk_bus_code", columnNames = "bus_code"))
public class BusRoute {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bus_name", nullable = false, length = 100)
    private String name;

    @Column(name = "bus_code", nullable = false, length = 24)
    private String code;

    @Column(nullable = false, length = 80)
    private String source;

    @Column(nullable = false, length = 80)
    private String destination;

    @Column(name = "departure_time", nullable = false)
    private LocalTime departureTime;

    @Column(name = "arrival_time", nullable = false)
    private LocalTime arrivalTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private BusCategory category;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal fare;

    @Column(nullable = false)
    private boolean enabled = true;

    @Version
    private Long version;

    protected BusRoute() {
    }

    public BusRoute(String name, String code, String source, String destination,
                    LocalTime departureTime, LocalTime arrivalTime, BusCategory category,
                    BigDecimal fare, boolean enabled) {
        this.name = name;
        this.code = code;
        this.source = source;
        this.destination = destination;
        this.departureTime = departureTime;
        this.arrivalTime = arrivalTime;
        this.category = category;
        this.fare = fare;
        this.enabled = enabled;
    }

    public void update(String name, String code, String source, String destination,
                       LocalTime departureTime, LocalTime arrivalTime, BusCategory category,
                       BigDecimal fare, boolean enabled) {
        this.name = name;
        this.code = code;
        this.source = source;
        this.destination = destination;
        this.departureTime = departureTime;
        this.arrivalTime = arrivalTime;
        this.category = category;
        this.fare = fare;
        this.enabled = enabled;
    }

    public void deactivate() { this.enabled = false; }
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getCode() { return code; }
    public String getSource() { return source; }
    public String getDestination() { return destination; }
    public LocalTime getDepartureTime() { return departureTime; }
    public LocalTime getArrivalTime() { return arrivalTime; }
    public BusCategory getCategory() { return category; }
    public BigDecimal getFare() { return fare; }
    public boolean isEnabled() { return enabled; }
}
