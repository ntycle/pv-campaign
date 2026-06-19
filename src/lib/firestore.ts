import {
  collection, doc,
  getDocs, getDoc,
  addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy,
  onSnapshot, type Unsubscribe,
  serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db, COLLECTIONS } from "./firebase";
import type { Campaign, ContentItem, Booking, KpiEntry, TeamId } from "@/types";

// ── helpers ────────────────────────────────────────────────
function fromFirestore<T>(snap: { id: string; data(): Record<string, unknown> }): T {
  const data = snap.data();
  // Convert Timestamps to ISO strings
  const converted = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [
      k,
      v instanceof Timestamp ? v.toDate().toISOString() : v,
    ])
  );
  return { id: snap.id, ...converted } as T;
}

// ── CAMPAIGNS ──────────────────────────────────────────────
export function subscribeCampaigns(cb: (data: Campaign[]) => void): Unsubscribe {
  const q = query(collection(db, COLLECTIONS.campaigns), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap => cb(snap.docs.map(d => fromFirestore<Campaign>(d))));
}

export async function createCampaign(data: Omit<Campaign, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.campaigns), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCampaign(id: string, data: Partial<Campaign>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.campaigns, id), { ...data });
}

export async function deleteCampaign(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.campaigns, id));
}

// ── CONTENT ITEMS ──────────────────────────────────────────
export function subscribeContent(
  weekIndex: number,
  cb: (data: ContentItem[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.content),
    where("weekIndex", "==", weekIndex)
  );
  return onSnapshot(q, snap => cb(snap.docs.map(d => fromFirestore<ContentItem>(d))));
}

export async function createContent(data: Omit<ContentItem, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.content), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateContent(id: string, data: Partial<ContentItem>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.content, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteContent(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.content, id));
}

// ── BOOKINGS ───────────────────────────────────────────────
export function subscribeBookings(
  weekIndex: number,
  cb: (data: Booking[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.bookings),
    where("weekIndex", "==", weekIndex)
  );
  return onSnapshot(q, snap => cb(snap.docs.map(d => fromFirestore<Booking>(d))));
}

export async function createBooking(data: Omit<Booking, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.bookings), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateBooking(id: string, data: Partial<Booking>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.bookings, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBooking(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.bookings, id));
}

// ── KPI ENTRIES ────────────────────────────────────────────
export function subscribeKpis(
  campaignId: string,
  weekIndex: number,
  cb: (data: KpiEntry[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.kpis),
    where("campaignId", "==", campaignId),
    where("weekIndex", "==", weekIndex)
  );
  return onSnapshot(q, snap => cb(snap.docs.map(d => fromFirestore<KpiEntry>(d))));
}

export async function upsertKpi(entry: Omit<KpiEntry, "id"> & { id?: string }): Promise<void> {
  if (entry.id) {
    const { id, ...rest } = entry;
    await updateDoc(doc(db, COLLECTIONS.kpis, id), {
      ...rest,
      updatedAt: serverTimestamp(),
    });
  } else {
    await addDoc(collection(db, COLLECTIONS.kpis), {
      ...entry,
      updatedAt: serverTimestamp(),
    });
  }
}
