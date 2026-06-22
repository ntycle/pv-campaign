import {
  collection, doc,
  getDocs, getDoc,
  addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy,
  onSnapshot, type Unsubscribe,
  serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db, COLLECTIONS } from "./firebase";
import type {
  Campaign, ContentItem, Booking, KpiEntry, TeamId,
  ReportEntry, TeamPlan, UserProfile, Period,
} from "@/types";

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

export async function getCampaign(id: string): Promise<Campaign | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.campaigns, id));
  return snap.exists() ? fromFirestore<Campaign>(snap) : null;
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
export function subscribeContentLegacy(
  monthIndex: number,
  weekIndex: number,
  cb: (data: ContentItem[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.content),
    where("monthIndex", "==", monthIndex),
    where("weekIndex", "==", weekIndex)
  );
  return onSnapshot(q, snap => cb(snap.docs.map(d => fromFirestore<ContentItem>(d))));
}

export async function createContentLegacy(data: Omit<ContentItem, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.content), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateContentLegacy(id: string, data: Partial<ContentItem>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.content, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteContentLegacy(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.content, id));
}

// ── BOOKINGS ───────────────────────────────────────────────
export function subscribeBookingsLegacy(
  weekIndex: number,
  cb: (data: Booking[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.bookings),
    where("weekIndex", "==", weekIndex)
  );
  return onSnapshot(q, snap => cb(snap.docs.map(d => fromFirestore<Booking>(d))));
}

export async function createBookingLegacy(data: Omit<Booking, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.bookings), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateBookingLegacy(id: string, data: Partial<Booking>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.bookings, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBookingLegacy(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.bookings, id));
}

// ── KPI ENTRIES (legacy) ───────────────────────────────────
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
  const { id, ...rest } = entry;
  if (id) {
    await updateDoc(doc(db, COLLECTIONS.kpis, id), {
      ...rest,
      updatedAt: serverTimestamp(),
    });
  } else {
    await addDoc(collection(db, COLLECTIONS.kpis), {
      ...rest,
      updatedAt: serverTimestamp(),
    });
  }
}

// ── REPORT ENTRIES (unified) ────────────────────────────────
const REPORTS = "reports";

export function subscribeReports(
  campaignId: string,
  cb: (data: ReportEntry[]) => void
): Unsubscribe {
  const q = query(collection(db, REPORTS), where("campaignId", "==", campaignId));
  return onSnapshot(q, snap => cb(snap.docs.map(d => fromFirestore<ReportEntry>(d))));
}

export function subscribeReportsByTeam(
  campaignId: string,
  teamId: TeamId,
  cb: (data: ReportEntry[]) => void
): Unsubscribe {
  const q = query(
    collection(db, REPORTS),
    where("campaignId", "==", campaignId),
    where("teamId", "==", teamId)
  );
  return onSnapshot(q, snap => cb(snap.docs.map(d => fromFirestore<ReportEntry>(d))));
}

export async function getCampaignKPIs(campaignId: string): Promise<Record<string, Record<string, number>>> {
  const q = query(
    collection(db, REPORTS),
    where("campaignId", "==", campaignId),
    where("period.type", "==", "campaign")
  );
  const snap = await getDocs(q);
  const result: Record<string, Record<string, number>> = {};
  snap.docs.forEach(d => {
    const data = fromFirestore<ReportEntry>(d);
    if (!result[data.teamId]) result[data.teamId] = {};
    result[data.teamId][data.metricId] = data.target;
  });
  return result;
}

/** Upsert by (campaignId + teamId + metricId + period.type + period.value) */
export async function upsertReport(
  entry: Omit<ReportEntry, "id"> & { id?: string }
): Promise<void> {
  if (entry.id) {
    const { id, ...rest } = entry;
    await updateDoc(doc(db, REPORTS, id), { ...rest, updatedAt: serverTimestamp() });
  } else {
    // Try to find existing doc with same composite key
    const q = query(
      collection(db, REPORTS),
      where("campaignId",  "==", entry.campaignId),
      where("teamId",      "==", entry.teamId),
      where("metricId",    "==", entry.metricId),
      where("period.type", "==", entry.period.type),
      where("period.value","==", entry.period.value)
    );
    const snap = await getDocs(q);
    const { id, ...rest } = entry;
    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, { ...rest, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, REPORTS), { ...rest, updatedAt: serverTimestamp() });
    }
  }
}

// ── TEAM PLANS ─────────────────────────────────────────────
const TEAM_PLANS = "teamPlans";

export function subscribeTeamPlans(
  campaignId: string,
  cb: (data: TeamPlan[]) => void
): Unsubscribe {
  const q = query(collection(db, TEAM_PLANS), where("campaignId", "==", campaignId));
  return onSnapshot(q, snap => cb(snap.docs.map(d => fromFirestore<TeamPlan>(d))));
}

export async function upsertTeamPlan(
  plan: Omit<TeamPlan, "id"> & { id?: string }
): Promise<void> {
  if (plan.id) {
    const { id, ...rest } = plan;
    await updateDoc(doc(db, TEAM_PLANS, id), { ...rest, updatedAt: serverTimestamp() });
  } else {
    const q = query(
      collection(db, TEAM_PLANS),
      where("campaignId", "==", plan.campaignId),
      where("teamId",     "==", plan.teamId)
    );
    const snap = await getDocs(q);
    const { id, ...rest } = plan;
    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, { ...rest, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, TEAM_PLANS), { ...rest, updatedAt: serverTimestamp() });
    }
  }
}

// ── CONTENT ITEMS ───────────────────────────────────────────
const CONTENTS = "contents";

export function subscribeContentItems(
  campaignId: string,
  teamId: string,
  cb: (data: ContentItem[]) => void
): Unsubscribe {
  const q = query(
    collection(db, CONTENTS),
    where("campaignId", "==", campaignId),
    where("teamId", "==", teamId)
  );
  return onSnapshot(q, snap => cb(snap.docs.map(d => fromFirestore<ContentItem>(d))));
}

export function subscribeAllContentItems(
  cb: (data: ContentItem[]) => void
): Unsubscribe {
  const q = collection(db, CONTENTS);
  return onSnapshot(q, snap => cb(snap.docs.map(d => fromFirestore<ContentItem>(d))));
}

export async function upsertContentItem(
  item: Omit<ContentItem, "id"> & { id?: string }
): Promise<void> {
  if (item.id) {
    const { id, ...rest } = item;
    await updateDoc(doc(db, CONTENTS, id), { ...rest, updatedAt: serverTimestamp() });
  } else {
    await addDoc(collection(db, CONTENTS), { ...item, updatedAt: serverTimestamp() });
  }
}

export async function deleteContentItem(id: string): Promise<void> {
  await deleteDoc(doc(db, CONTENTS, id));
}

// ── BOOKINGS ──────────────────────────────────────────────
const BOOKINGS = "bookings";

export function subscribeBookings(
  campaignId: string,
  teamId: string,
  cb: (data: Booking[]) => void
): Unsubscribe {
  const q = query(
    collection(db, BOOKINGS),
    where("campaignId", "==", campaignId),
    where("teams", "array-contains", teamId)
  );
  return onSnapshot(q, snap => cb(snap.docs.map(d => fromFirestore<Booking>(d))));
}

export function subscribeAllBookings(
  cb: (data: Booking[]) => void
): Unsubscribe {
  const q = collection(db, BOOKINGS);
  return onSnapshot(q, snap => cb(snap.docs.map(d => fromFirestore<Booking>(d))));
}

export async function upsertBooking(
  booking: Omit<Booking, "id"> & { id?: string }
): Promise<void> {
  if (booking.id) {
    const { id, ...rest } = booking;
    await updateDoc(doc(db, BOOKINGS, id), { ...rest, updatedAt: serverTimestamp() });
  } else {
    await addDoc(collection(db, BOOKINGS), { ...booking, updatedAt: serverTimestamp() });
  }
}

export async function deleteBooking(id: string): Promise<void> {
  await deleteDoc(doc(db, BOOKINGS, id));
}

// ── USER PROFILES ──────────────────────────────────────────
const USERS = "users";

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function upsertUserProfile(profile: UserProfile): Promise<void> {
  await setDoc(doc(db, USERS, profile.uid), profile, { merge: true });
}

// ── Period helpers ─────────────────────────────────────────
export function periodKey(p: Period): string {
  return `${p.type}:${p.value}`;
}
