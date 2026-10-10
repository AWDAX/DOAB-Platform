/** Named places used as sample points for the India live hazard map. */

export interface LivePlace {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
}

export const LIVE_PLACES: LivePlace[] = [
  { id: 'srinagar', name: 'Srinagar', state: 'Jammu and Kashmir', lat: 34.08, lng: 74.8 },
  { id: 'leh', name: 'Leh', state: 'Ladakh', lat: 34.16, lng: 77.58 },
  { id: 'amritsar', name: 'Amritsar', state: 'Punjab', lat: 31.63, lng: 74.87 },
  { id: 'shimla', name: 'Shimla', state: 'Himachal Pradesh', lat: 31.1, lng: 77.17 },
  { id: 'chandigarh', name: 'Chandigarh', state: 'Chandigarh', lat: 30.73, lng: 76.78 },
  { id: 'delhi', name: 'Delhi', state: 'Delhi', lat: 28.61, lng: 77.21 },
  { id: 'dehradun', name: 'Dehradun', state: 'Uttarakhand', lat: 30.32, lng: 78.03 },
  { id: 'jaipur', name: 'Jaipur', state: 'Rajasthan', lat: 26.91, lng: 75.79 },
  { id: 'jodhpur', name: 'Jodhpur', state: 'Rajasthan', lat: 26.24, lng: 73.02 },
  { id: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.85, lng: 80.95 },
  { id: 'varanasi', name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.32, lng: 82.97 },
  { id: 'patna', name: 'Patna', state: 'Bihar', lat: 25.59, lng: 85.14 },
  { id: 'gangtok', name: 'Gangtok', state: 'Sikkim', lat: 27.33, lng: 88.61 },
  { id: 'guwahati', name: 'Guwahati', state: 'Assam', lat: 26.14, lng: 91.74 },
  { id: 'itanagar', name: 'Itanagar', state: 'Arunachal Pradesh', lat: 27.08, lng: 93.61 },
  { id: 'shillong', name: 'Shillong', state: 'Meghalaya', lat: 25.57, lng: 91.88 },
  { id: 'imphal', name: 'Imphal', state: 'Manipur', lat: 24.82, lng: 93.94 },
  { id: 'kohima', name: 'Kohima', state: 'Nagaland', lat: 25.67, lng: 94.11 },
  { id: 'aizawl', name: 'Aizawl', state: 'Mizoram', lat: 23.73, lng: 92.72 },
  { id: 'agartala', name: 'Agartala', state: 'Tripura', lat: 23.83, lng: 91.28 },
  { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', lat: 22.57, lng: 88.36 },
  { id: 'ranchi', name: 'Ranchi', state: 'Jharkhand', lat: 23.34, lng: 85.31 },
  { id: 'bhubaneswar', name: 'Bhubaneswar', state: 'Odisha', lat: 20.3, lng: 85.82 },
  { id: 'raipur', name: 'Raipur', state: 'Chhattisgarh', lat: 21.25, lng: 81.63 },
  { id: 'bhopal', name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.26, lng: 77.41 },
  { id: 'indore', name: 'Indore', state: 'Madhya Pradesh', lat: 22.72, lng: 75.86 },
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', lat: 23.02, lng: 72.57 },
  { id: 'surat', name: 'Surat', state: 'Gujarat', lat: 21.17, lng: 72.83 },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', lat: 19.08, lng: 72.88 },
  { id: 'pune', name: 'Pune', state: 'Maharashtra', lat: 18.52, lng: 73.86 },
  { id: 'nagpur', name: 'Nagpur', state: 'Maharashtra', lat: 21.15, lng: 79.09 },
  { id: 'panaji', name: 'Panaji', state: 'Goa', lat: 15.49, lng: 73.83 },
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', lat: 17.39, lng: 78.49 },
  { id: 'visakhapatnam', name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.69, lng: 83.22 },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', lat: 12.97, lng: 77.59 },
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', lat: 13.08, lng: 80.27 },
  { id: 'madurai', name: 'Madurai', state: 'Tamil Nadu', lat: 9.93, lng: 78.12 },
  { id: 'kochi', name: 'Kochi', state: 'Kerala', lat: 9.93, lng: 76.26 },
  { id: 'thiruvananthapuram', name: 'Thiruvananthapuram', state: 'Kerala', lat: 8.52, lng: 76.94 },
  { id: 'portblair', name: 'Port Blair', state: 'Andaman and Nicobar Islands', lat: 11.62, lng: 92.73 },
];

export const INDIA_VIEW = { center: [22.8, 82.0] as [number, number], zoom: 5 };
