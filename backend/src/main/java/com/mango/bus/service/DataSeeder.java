package com.mango.bus.service;

import com.mango.bus.domain.AppUser;
import com.mango.bus.domain.BusCategory;
import com.mango.bus.domain.BusRoute;
import com.mango.bus.domain.Role;
import com.mango.bus.repository.AppUserRepository;
import com.mango.bus.repository.BusRouteRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;

@Component
public class DataSeeder implements CommandLineRunner {
    private final AppUserRepository users;
    private final BusRouteRepository buses;
    private final PasswordEncoder passwordEncoder;

    @Value("${mango.admin.username:admin}")
    private String adminUsername;

    @Value("${mango.admin.password:Admin@123}")
    private String adminPassword;

    public DataSeeder(AppUserRepository users, BusRouteRepository buses, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.buses = buses;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        String normalizedAdmin = adminUsername.trim().toLowerCase(Locale.ROOT);
        if (users.findByUsername(normalizedAdmin).isEmpty()) {
            users.save(new AppUser(normalizedAdmin, "Mango Administrator", passwordEncoder.encode(adminPassword), Role.ADMIN));
        }

        if (buses.count() == 0) {
            buses.saveAll(List.of(
                new BusRoute("Mango Nightliner", "MN-101", "Hyderabad", "Bengaluru", LocalTime.of(21, 0), LocalTime.of(7, 0), BusCategory.AC_SLEEPER, new BigDecimal("1299.00"), true),
                new BusRoute("Mango Comfort", "MN-102", "Hyderabad", "Vijayawada", LocalTime.of(22, 0), LocalTime.of(5, 0), BusCategory.AC_SEATER_SEMI_SLEEPER, new BigDecimal("699.00"), true),
                new BusRoute("Mango Traveller", "MN-103", "Hyderabad", "Chennai", LocalTime.of(20, 30), LocalTime.of(7, 30), BusCategory.NON_AC_SLEEPER, new BigDecimal("899.00"), true),
                new BusRoute("Mango Cityliner", "MN-104", "Hyderabad", "Warangal", LocalTime.of(8, 0), LocalTime.of(12, 0), BusCategory.NON_AC_SEATER, new BigDecimal("349.00"), true),
                new BusRoute("Mango Express", "MN-105", "Bengaluru", "Chennai", LocalTime.of(22, 15), LocalTime.of(5, 45), BusCategory.AC_SEATER_SEMI_SLEEPER, new BigDecimal("749.00"), true),
                new BusRoute("Mango Elite", "MN-106", "Vijayawada", "Hyderabad", LocalTime.of(23, 0), LocalTime.of(6, 0), BusCategory.AC_SLEEPER, new BigDecimal("1199.00"), true)
            ));
        }
    }
}
