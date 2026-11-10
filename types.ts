export type Role = 'ADMIN' | 'USER';
export type BusCategory = 'AC_SLEEPER' | 'AC_SEATER_SEMI_SLEEPER' | 'NON_AC_SLEEPER' | 'NON_AC_SEATER';
export type SeatType = 'SEATER' | 'SLEEPER';
export type Availability = 'AVAILABLE' | 'LIMITED' | 'LOW' | 'FULL';
export type ReservationStatus = 'CONFIRMED' | 'CANCELLED';

export interface User {
  id: number;
  username: string;
  displayName: string;
  role: Role;
}

export interface Bus {
  id: number;
  name: string;
  code: string;
  source: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  category: BusCategory;
  categoryLabel: string;
  fare: number;
  availableSeats: number;
  availability: Availability;
  enabled: boolean;
}

export interface Seat {
  seatNumber: number;
  status: 'AVAILABLE' | 'BOOKED';
  seatType: SeatType;
  deck: 'LOWER' | 'UPPER' | 'MAIN';
}

export interface SeatMap {
  busId: number;
  journeyDate: string;
  seats: Seat[];
  availableSeats: number;
  availability: Availability;
}

export interface Passenger {
  seatNumber: number;
  name: string;
  age: number;
  gender: string;
}

export interface Booking {
  bookingCode: string;
  busId: number;
  busName: string;
  busCode: string;
  source: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  category: BusCategory;
  categoryLabel: string;
  journeyDate: string;
  seatNumber: number;
  seatType?: SeatType;
  fare: number;
  status: ReservationStatus;
  username: string;
  displayName: string;
  bookedAt: string;
  passengerName?: string;
  passengerAge?: number;
  passengerGender?: string;
  groupBookingCode?: string;
}

export interface DashboardStats {
  totalRoutes: number;
  activeRoutes: number;
  totalUsers: number;
  confirmedBookings: number;
  upcomingBookings: number;
}

export interface BusPayload {
  name: string;
  code: string;
  source: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  category: BusCategory;
  fare: number;
  enabled: boolean;
}
