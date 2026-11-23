import { describe, expect, it } from 'vitest';
import { parseBooking, splitFlights } from '../trip';

describe('parseBooking', () => {
  it('reads a plain-text airline email', () => {
    const p = parseBooking(`Your trip confirmation number: XYZ123
Saturday, November 28, 2026
United Airlines UA 1234
San Francisco (SFO) 1:05 PM → Las Vegas (LAS) 2:40 PM
Thursday, December 3, 2026
UA 5678
Las Vegas (LAS) 7:15 PM → San Francisco (SFO) 8:50 PM`);
    const { arrive, depart } = splitFlights(p.flights);
    expect(arrive).toMatchObject({ number: 'UA1234', from: 'SFO', to: 'LAS', arrDate: '2026-11-28', arrTime: 14 * 60 + 40, confirmation: 'XYZ123' });
    expect(depart).toMatchObject({ number: 'UA5678', from: 'LAS', to: 'SFO', depDate: '2026-12-03', depTime: 19 * 60 + 15 });
  });

  it('reads schema.org JSON-LD', () => {
    const p = parseBooking(`<script type="application/ld+json">{"@context":"http://schema.org","@type":"FlightReservation","reservationNumber":"RXJ34P","reservationFor":{"@type":"Flight","flightNumber":"110","airline":{"@type":"Airline","name":"Delta","iataCode":"DL"},"departureAirport":{"@type":"Airport","iataCode":"JFK"},"departureTime":"2026-11-28T10:30:00-05:00","arrivalAirport":{"@type":"Airport","iataCode":"LAS"},"arrivalTime":"2026-11-28T13:05:00-08:00"}}</script>`);
    expect(p.flights[0]).toMatchObject({ number: 'DL110', from: 'JFK', to: 'LAS', arrTime: 13 * 60 + 5, confirmation: 'RXJ34P' });
  });

  it('reads a hotel confirmation', () => {
    const p = parseBooking(`Thank you for booking The Venetian Resort Las Vegas.
Reservation number: 88812345
Check-in: Sat, Nov 28, 2026
Check-out: Thu, Dec 3, 2026
1 King room, 5 nights`);
    expect(p).toMatchObject({ hotelId: 'venetian', hotelIn: '2026-11-28', hotelOut: '2026-12-03', hotelConfirmation: '88812345' });
  });

  it('handles 24h times and day-month dates', () => {
    const p = parseBooking(`Thai Airways TG 682 28 Nov 2026 BKK 09:10 → LAX 06:20\nAlaska AS 1350 28 Nov 2026 LAX 09:30 → LAS 10:45`);
    const { arrive } = splitFlights(p.flights);
    expect(arrive).toMatchObject({ number: 'AS1350', to: 'LAS', arrTime: 10 * 60 + 45 });
  });
});
