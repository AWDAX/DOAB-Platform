/**
 * Amazon Location Service — DOAB Geocoding & Place Search Client
 *
 * Place Index: doab-place-index (Esri, ap-southeast-2)
 * ARN: arn:aws:geo:ap-southeast-2:970909364340:place-index/doab-place-index
 *
 * Architecture:
 *   Primary:  Amazon Location Service (SearchPlaceIndexForText)
 *   Fallback: Hardcoded district centroid lookup (DISTRICT_CENTROIDS in geocode script)
 *
 * Auth: AWS Cognito Identity Pool (unauthenticated role) — no API key in source.
 * For the hackathon demo we use a Cognito unauthenticated identity that has
 * geo:SearchPlaceIndex* permission scoped to this specific place index ARN.
 * The identity pool ID is safe to embed (it is not a secret — it grants only
 * read access to this one resource).
 */

import {
  LocationClient,
  SearchPlaceIndexForTextCommand,
  type SearchPlaceIndexForTextCommandInput,
} from '@aws-sdk/client-location';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

const REGION = 'ap-southeast-2';
const PLACE_INDEX = 'doab-place-index';

// Cognito Identity Pool ID — unauthenticated role grants geo:SearchPlaceIndex* on this index only
// This is intentionally public (read-only, scoped resource).
const IDENTITY_POOL_ID = import.meta.env.VITE_AWS_COGNITO_IDENTITY_POOL_ID as string | undefined;

export interface GeocodedPlace {
  label: string;
  lat: number;
  lng: number;
  country?: string;
  region?: string;
  municipality?: string;
}

let _client: LocationClient | null = null;

function getClient(): LocationClient | null {
  if (_client) return _client;
  if (!IDENTITY_POOL_ID) return null; // No credentials configured — fall back silently

  try {
    _client = new LocationClient({
      region: REGION,
      credentials: fromCognitoIdentityPool({
        clientConfig: { region: REGION },
        identityPoolId: IDENTITY_POOL_ID,
      }),
    });
    return _client;
  } catch {
    return null;
  }
}

/**
 * Geocode a free-text query using Amazon Location Service.
 * Returns up to `maxResults` results ranked by relevance.
 * Returns an empty array on error or if ALS is not configured.
 */
export async function geocodePlace(
  query: string,
  maxResults = 5,
  biasPosition?: [number, number], // [lng, lat]
): Promise<GeocodedPlace[]> {
  const client = getClient();
  if (!client || !query.trim()) return [];

  // Normalize common phonetic variations (e.g. Shardha -> Sharda)
  const normalizedText = query.replace(/\bshardha\b/gi, 'Sharda').trim();

  const input: SearchPlaceIndexForTextCommandInput = {
    IndexName: PLACE_INDEX,
    Text: normalizedText,
    MaxResults: maxResults,
    // Bias to reference location (origin / GPS / map center) so closest places rank #1, like Google Maps
    BiasPosition: biasPosition || [78.9629, 20.5937], // [lng, lat] — ALS uses [lng, lat] order
    FilterCountries: ['IND'],
  };

  try {
    const response = await client.send(new SearchPlaceIndexForTextCommand(input));
    const results = response.Results ?? [];

    return results
      .filter((r) => r.Place?.Geometry?.Point)
      .map((r) => {
        const [lng, lat] = r.Place!.Geometry!.Point!; // ALS returns [lng, lat]
        return {
          label: r.Place!.Label ?? query,
          lat,
          lng,
          country: r.Place!.Country,
          region: r.Place!.Region,
          municipality: r.Place!.Municipality,
        };
      });
  } catch (err) {
    console.warn('[ALS] Geocode failed, falling back:', err);
    return [];
  }
}

/**
 * Single best-match geocode — returns the top result or null.
 * Used by MapPage search bar for instant pan-to-location.
 */
export async function geocodeSingle(
  query: string,
  biasPosition?: [number, number]
): Promise<GeocodedPlace | null> {
  const results = await geocodePlace(query, 1, biasPosition);
  return results[0] ?? null;
}
