
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserProfile } from '../shared/models/user-profile.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly apiUrl = '/api'; // Using proxy

  constructor(private http: HttpClient) { }

  getUserProfile(userId: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/user-profile/${userId}`);
  }

  simulateAttack(numTransactions: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/simulate-attack`, { num_transactions: numTransactions });
  }
}
