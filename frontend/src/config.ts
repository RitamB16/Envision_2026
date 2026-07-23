import * as THREE from 'three';

export interface RouteConfig {
  id: string;
  label: string;
  displayName: string;
  path: string;
  buildingPosition: [number, number, number];
  cameraOffset: [number, number, number];
  lookAt: [number, number, number];
  title: string;
  description: string;
  routePoints: THREE.Vector3[];
  finalPosition: THREE.Vector3;
  finalLookAt: THREE.Vector3;
  routeIndex: number;
  glowColor: string;
  fontFamily: string;
}

function getQuadBezierPoint(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number): THREE.Vector3 {
  const oneMinusT = 1 - t;
  return new THREE.Vector3()
    .addScaledVector(p0, oneMinusT * oneMinusT)
    .addScaledVector(p1, 2 * oneMinusT * t)
    .addScaledVector(p2, t * t);
}

export function buildRoute(rawPoints: THREE.Vector3[], closed: boolean = false): THREE.Vector3[] {
  const result: THREE.Vector3[] = [];
  const len = rawPoints.length;
  
  for (let i = 0; i < len; i++) {
    const isFirst = i === 0;
    const isLast = i === len - 1;
    
    if ((isFirst || isLast) && !closed) {
      result.push(rawPoints[i]);
      continue;
    }
    
    const prevIdx = isFirst ? (closed ? len - 1 : 0) : i - 1;
    const nextIdx = isLast ? (closed ? 0 : len - 1) : i + 1;
    
    const p1 = rawPoints[prevIdx];
    const corner = rawPoints[i];
    const p2 = rawPoints[nextIdx];
    
    const dirIn = new THREE.Vector3().subVectors(corner, p1).normalize();
    const dirOut = new THREE.Vector3().subVectors(p2, corner).normalize();
    
    // 90-degree turn (Smooth Bezier arc)
    if (Math.abs(dirIn.dot(dirOut)) < 0.5) {
      const entry = corner.clone().sub(dirIn.clone().multiplyScalar(6));
      const exit = corner.clone().add(dirOut.clone().multiplyScalar(6));
      
      const numSteps = 5;
      for (let s = 0; s <= numSteps; s++) {
        const t = s / numSteps;
        const pt = getQuadBezierPoint(entry, corner, exit, t);
        // Avoid duplicate pushing at boundaries if closed/sequential
        if (s === 0 && result.length > 0 && result[result.length - 1].distanceTo(pt) < 0.1) {
          continue;
        }
        result.push(pt);
      }
    } 
    // U-turn (Trigonometric circular/ellipsodial loop)
    else if (dirIn.dot(dirOut) < -0.9) {
      const right = new THREE.Vector3(0, 1, 0).cross(dirIn).normalize();
      const R = 4;
      const R_lateral = 3;
      const numSteps = 8;
      
      for (let s = 0; s <= numSteps; s++) {
        const phi = Math.PI - (s / numSteps) * (Math.PI * 2);
        const pt = corner.clone()
          .addScaledVector(dirIn, R * Math.cos(phi))
          .addScaledVector(right, R_lateral * Math.sin(phi));
        
        if (s === 0 && result.length > 0 && result[result.length - 1].distanceTo(pt) < 0.1) {
          continue;
        }
        result.push(pt);
      }
    }
    else {
      result.push(corner);
    }
  }
  return result;
}

const corners = [
  new THREE.Vector3(-287.15, 0.2, -143.65), // Southwest
  new THREE.Vector3(-287.15, 0.2, -71.7),   // Northwest
  new THREE.Vector3(-107.0, 0.2, -71.7),    // Northeast
  new THREE.Vector3(-107.0, 0.2, -143.65),  // Southeast
];

const rawBuiltPoints = buildRoute(corners, true);
const roughCurve = new THREE.CatmullRomCurve3(rawBuiltPoints, true);
const spacedPoints = roughCurve.getSpacedPoints(300);
spacedPoints.pop(); // Pop last duplicate point to avoid closed curve loop seam singularity

export const patrolRoutePoints = spacedPoints;
export const patrolCurve = new THREE.CatmullRomCurve3(patrolRoutePoints, true);

// Utility to find closest point on new route dynamically
const getClosestRouteIndex = (pos: THREE.Vector3): number => {
  let minD = Infinity;
  let minIdx = 0;
  for (let i = 0; i < patrolRoutePoints.length; i++) {
    const d = patrolRoutePoints[i].distanceTo(pos);
    if (d < minD) {
      minD = d;
      minIdx = i;
    }
  }
  return minIdx;
};

// Map original target road positions to the new patrol curve dynamically
const eventsIdx = getClosestRouteIndex(new THREE.Vector3(-218.53, 0.2, -71.66));
const galleryIdx = getClosestRouteIndex(new THREE.Vector3(-250.31, 0.2, -71.78));
const coordinatorsIdx = getClosestRouteIndex(new THREE.Vector3(-160.48, 0.2, -71.67));
const alumniIdx = getClosestRouteIndex(new THREE.Vector3(-197.75, 0.2, -71.63));
const sponsorsIdx = getClosestRouteIndex(new THREE.Vector3(-107.59, 0.2, -142.95));

export const destinations: RouteConfig[] = [
  {
    id: "events",
    label: "Events",
    displayName: "Events",
    path: "/events",
    buildingPosition: [-218.0, 3.0, -86.5],
    cameraOffset: [-218.0, 14.0, -42.0],
    lookAt: [-218.0, 8.0, -86.5],
    title: "PARAMOUNT THEATER",
    description: "Events",
    routePoints: [],
    finalPosition: patrolRoutePoints[eventsIdx],
    finalLookAt: patrolRoutePoints[(eventsIdx + 1) % patrolRoutePoints.length],
    routeIndex: eventsIdx,
    glowColor: '#ffaa00',
    fontFamily: "'Cinzel', 'Georgia', serif"
  },
  {
    id: "gallery",
    label: "Gallery",
    displayName: "Gallery",
    path: "/gallery",
    buildingPosition: [-251.0, 3.0, -89.5],
    cameraOffset: [-251.0, 14.0, -42.0],
    lookAt: [-251.0, 8.0, -89.5],
    title: "PAWN SHOP",
    description: "Gallery",
    routePoints: [],
    finalPosition: patrolRoutePoints[galleryIdx],
    finalLookAt: patrolRoutePoints[(galleryIdx + 1) % patrolRoutePoints.length],
    routeIndex: galleryIdx,
    glowColor: '#00f3ff',
    fontFamily: "'Impact', 'Arial Black', sans-serif"
  },
  {
    id: "coordinators",
    label: "Coordinators",
    displayName: "About Us",
    path: "/coordinators",
    buildingPosition: [-161.0, 3.0, -89.6],
    cameraOffset: [-161.0, 14.0, -42.0],
    lookAt: [-161.0, 8.0, -89.6],
    title: "GUN SHOP",
    description: "Coordinators",
    routePoints: [],
    finalPosition: patrolRoutePoints[coordinatorsIdx],
    finalLookAt: patrolRoutePoints[(coordinatorsIdx + 1) % patrolRoutePoints.length],
    routeIndex: coordinatorsIdx,
    glowColor: '#ff003c',
    fontFamily: "'Arial Black', sans-serif"
  },
  {
    id: "alumni",
    label: "Alumni",
    displayName: "Alumni",
    path: "/alumni",
    buildingPosition: [-197.0, 3.0, -89.5],
    cameraOffset: [-197.0, 14.0, -42.0],
    lookAt: [-197.0, 8.0, -89.5],
    title: "LIQUOR STORE",
    description: "Alumni",
    routePoints: [],
    finalPosition: patrolRoutePoints[alumniIdx],
    finalLookAt: patrolRoutePoints[(alumniIdx + 1) % patrolRoutePoints.length],
    routeIndex: alumniIdx,
    glowColor: '#39ff14',
    fontFamily: "'Courier New', monospace"
  },
  {
    id: "sponsors",
    label: "Partners",
    displayName: "Partners",
    path: "/sponsors",
    buildingPosition: [-71.0, 3.0, -161.5],
    cameraOffset: [-112.0, 15.0, -118.0],
    lookAt: [-71.0, 8.0, -161.5],
    title: "PAWN SHOP 3",
    description: "Partners",
    routePoints: [],
    finalPosition: patrolRoutePoints[sponsorsIdx],
    finalLookAt: patrolRoutePoints[(sponsorsIdx + 1) % patrolRoutePoints.length],
    routeIndex: sponsorsIdx,
    glowColor: '#e5c158',
    fontFamily: "'Outfit', sans-serif"
  }
];export const RAZORPAY_ME_URL = "https://razorpay.me/@ritambera8705";
export const RAZORPAY_UPI_ID = "ritambera8705@razorpay";
