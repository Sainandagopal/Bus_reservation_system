package com.mango.bus.web;

import com.mango.bus.domain.BusCategory;
import com.mango.bus.dto.ApiDtos.BusView;
import com.mango.bus.dto.ApiDtos.SeatMapView;
import com.mango.bus.service.BusService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/buses")
public class BusController {
    private final BusService busService;

    public BusController(BusService busService) {
        this.busService = busService;
    }

    @GetMapping
    public List<BusView> search(
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate journeyDate,
            @RequestParam(required = false) BusCategory category) {
        return busService.search(source, destination, journeyDate, category);
    }

    @GetMapping("/{busId}/seats")
    public SeatMapView seats(@PathVariable Long busId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate journeyDate) {
        return busService.seatMap(busId, journeyDate);
    }
}
