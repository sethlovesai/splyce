import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';

import { RootStackParamList } from '../types/navigation';
import { GradientHeader } from '../components/GradientHeader';
import { ensureHostId } from '../services/firebase';
import { createSession, subscribeToSession, addGuest, deleteSession } from '../services/liveSession';
import { LiveSession } from '../types/session';
import { expandReceiptItems } from '../utils/receiptItems';

// Guest join page, served by Firebase Hosting (see web-guest/ + firebase.json).
const LIVE_LINK_BASE = 'https://splyce-6739e.web.app/join';

const initialOf = (name: string) => (name?.trim()?.charAt(0) || '?').toUpperCase();

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddParticipants'>;
type RouteProps = RouteProp<RootStackParamList, 'AddParticipants'>;

export default function AddParticipantsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { items, restaurantName, totals } = route.params;

  const [names, setNames] = useState<string[]>(['You']);

  // --- Live session (host gathers guests here, before item selection) ---
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [copied, setCopied] = useState(false);
  // Once the host continues to item selection, SelectItems owns the session (it
  // finalizes it), so this screen must not cancel it on unmount.
  const handedOffRef = React.useRef(false);

  const liveUrl = sessionId ? `${LIVE_LINK_BASE}/${sessionId}` : '';
  const displayUrl = liveUrl.replace(/^https?:\/\//, '');

  React.useEffect(() => {
    if (!sessionId) return;
    return subscribeToSession(sessionId, setLiveSession, (err) =>
      console.warn('Live session listener error:', err.message),
    );
  }, [sessionId]);

  const guests = liveSession?.guests ?? [];

  const handleSendLiveLink = async () => {
    if (creatingSession || sessionId) return;
    setCreatingSession(true);
    try {
      const hostId = await ensureHostId();
      // Expand quantities to unit-level so the guest page shows the same rows the
      // host sees (each unit claimable separately).
      const id = await createSession(
        { restaurantName, items: expandReceiptItems(items) },
        hostId,
      );
      setSessionId(id);
      // The live card expands inline to show the link, roster and controls —
      // no OS share sheet fired automatically.
    } catch (err) {
      console.warn('Failed to start live session:', err);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleCopyLink = async () => {
    if (!liveUrl) return;
    await Clipboard.setStringAsync(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShareLink = async () => {
    if (!liveUrl) return;
    try {
      await Share.share({
        message: `Join my Splyce bill for ${restaurantName} and claim your items: ${liveUrl}`,
        url: liveUrl,
        title: `Splyce live split — ${restaurantName}`,
      });
    } catch (err) {
      console.warn('Share failed:', err);
    }
  };

  // Auto-cleanup: if the host backs out of this screen while a live session is
  // still open and unfinalized, cancel it so we don't leave an orphaned doc.
  // Continuing forward to item selection keeps this screen mounted, so this only
  // fires on a genuine back-out — the finalize/close happens later on SelectItems.
  React.useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (handedOffRef.current) return; // SelectItems owns the session now
      if (!sessionId || liveSession?.status === 'closed') return;
      const joined = liveSession?.guests?.length ?? 0;

      if (joined === 0) {
        // Nobody joined — silently discard the abandoned session (best-effort;
        // the Firestore TTL policy is the backstop if this write doesn't land).
        ensureHostId()
          .then(() => deleteSession(sessionId))
          .catch((err) => console.warn('Failed to delete abandoned session:', err));
        return; // let navigation proceed
      }

      // People already joined — confirm before cancelling their claims.
      e.preventDefault();
      Alert.alert(
        'Leave and cancel this split?',
        `${joined} ${joined === 1 ? 'person has' : 'people have'} joined. Going back cancels the live session and their claims.`,
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Cancel split',
            style: 'destructive',
            onPress: async () => {
              try {
                await ensureHostId();
                await deleteSession(sessionId);
              } catch (err) {
                console.warn('Failed to delete session:', err);
              }
              navigation.dispatch(e.data.action);
            },
          },
        ],
      );
    });
    return unsub;
  }, [navigation, sessionId, liveSession]);

  // Dev-only: fake a guest joining, to test the live roster without a 2nd device.
  const handleSimulateJoin = async () => {
    if (!sessionId) return;
    const pool = ['Alex', 'Bailey', 'Cameron', 'Devin', 'Emerson'];
    const name = pool[Math.floor(Math.random() * pool.length)];
    try {
      await addGuest(sessionId, `g-${name.toLowerCase()}`, name);
    } catch (err) {
      console.warn('Simulated join failed:', err);
    }
  };

  const updateName = (index: number, value: string) => {
    setNames((prev) => prev.map((name, idx) => (idx === index ? value : name)));
  };

  const addPerson = () => {
    setNames((prev) => [...prev, `Person ${prev.length + 1}`]);
  };

  const removePerson = (index: number) => {
    setNames((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleContinue = () => {
    const participants = names.map((name) => name.trim()).filter(Boolean);
    // Live guests claim their own items, so a session alone is enough to proceed.
    if (participants.length === 0 && !sessionId) return;

    handedOffRef.current = true; // SelectItems now owns any live session
    navigation.navigate('SelectItems', {
      items,
      participants,
      restaurantName,
      totals,
      sessionId: sessionId ?? undefined,
    });
  };

  const canRemove = names.length > 1;

  // Unified roster: manual names + guests joined via link are ONE list and ONE
  // count. Guests already present as a manual name aren't shown twice.
  const manualNames = names.map((n) => n.trim()).filter(Boolean);
  const manualLower = new Set(manualNames.map((n) => n.toLowerCase()));
  const linkGuests = guests.filter((g) => !manualLower.has(g.name.trim().toLowerCase()));
  const uniqueCount = new Set([
    ...manualNames.map((n) => n.toLowerCase()),
    ...guests.map((g) => g.name.trim().toLowerCase()),
  ]).size;

  return (
    <View style={styles.container}>
      <GradientHeader title="Who's Splitting?" subtitle="Add everyone joining this bill" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.groupIcon}>
              <Ionicons name="people-outline" size={22} color="#1c2433" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Group Size</Text>
              <Text style={styles.cardSubtitle}>{uniqueCount} people</Text>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity
                onPress={() => canRemove && removePerson(names.length - 1)}
                disabled={!canRemove}
                style={[styles.counterButton, !canRemove && styles.counterDisabled]}
                activeOpacity={0.8}
              >
                <Text style={styles.counterText}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addPerson} style={styles.counterButton} activeOpacity={0.8}>
                <Text style={styles.counterText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.liveCard}>
          {sessionId ? (
            <>
              <View style={styles.liveHeaderRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveTitle}>Live link active</Text>
              </View>

              <View style={styles.urlPill}>
                <Text style={styles.urlText} numberOfLines={1} ellipsizeMode="middle">
                  {displayUrl}
                </Text>
              </View>

              <View style={styles.linkButtonsRow}>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink} activeOpacity={0.9}>
                  <Ionicons name={copied ? 'checkmark' : 'link'} size={18} color="#ffffff" />
                  <Text style={styles.copyButtonText}>{copied ? 'Copied!' : 'Copy Link'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareLink} activeOpacity={0.9}>
                  <Text style={styles.shareButtonText}>Share…</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.linkDivider} />

              <View style={styles.joinedRow}>
                <View style={styles.joinedLeft}>
                  <View style={styles.joinedDot} />
                  <Text style={styles.joinedText}>
                    {guests.length} of {names.length} joined
                  </Text>
                </View>
                {__DEV__ ? (
                  <TouchableOpacity onPress={handleSimulateJoin} hitSlop={8}>
                    <Text style={styles.simulateLink}>Simulate a join</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {guests.length > 0 ? (
                <View style={styles.rosterRow}>
                  {guests.map((g, i) => (
                    <View key={g.guestId} style={[styles.rosterAvatar, i > 0 && styles.rosterOverlap]}>
                      <Text style={styles.rosterInitial}>{initialOf(g.name)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.rosterEmpty}>No one has joined yet.</Text>
              )}

              <Text style={styles.cancelHint}>
                Going back cancels this live session.
              </Text>
            </>
          ) : (
            <TouchableOpacity
              style={styles.liveLinkButton}
              onPress={handleSendLiveLink}
              disabled={creatingSession}
              activeOpacity={0.9}
            >
              <Ionicons name="share-social-outline" size={18} color="#5b4ddb" />
              <Text style={styles.liveLinkText}>
                {creatingSession ? 'Starting…' : 'Send Live Link'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionLabel}>
          {sessionId ? 'Add anyone not joining the link' : 'Enter names'}
        </Text>

        <View style={styles.inputs}>
          {names.map((name, idx) => (
            <View key={String(idx)} style={styles.inputRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{idx + 1}</Text>
            </View>
            <TextInput
              style={[styles.input, idx === 0 && styles.inputYou]}
              value={name}
              onChangeText={(value) => updateName(idx, value)}
              placeholder={`Person ${idx + 1}`}
              placeholderTextColor="#9fb0bf"
            />
            {idx > 0 ? (
              <TouchableOpacity onPress={() => removePerson(idx)} hitSlop={8}>
                <Text style={styles.removeText}>−</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          ))}

          {linkGuests.map((g) => (
            <View key={g.guestId} style={[styles.inputRow, styles.guestRow]}>
              <View style={[styles.avatar, styles.guestAvatar]}>
                <Ionicons name="link-outline" size={16} color="#5b4ddb" />
              </View>
              <Text style={[styles.input, styles.guestName]}>{g.name}</Text>
              <View style={styles.joinedTag}>
                <Text style={styles.joinedTagText}>joined</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addMore} onPress={addPerson} activeOpacity={0.9}>
            <Text style={styles.addMoreText}>+   Add Another Person</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={handleContinue} activeOpacity={0.9}>
          <Text style={styles.footerText}>Continue to Items</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8f7',
  },
  scroll: {
    flex: 1,
    paddingVertical: 40,
  },
  content: {
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 16,
    marginTop: -16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupIcon: {
    height: 44,
    width: 44,
    borderRadius: 12,
    backgroundColor: '#eef8f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c2433',
  },
  cardSubtitle: {
    color: '#6b7b8e',
    marginTop: 2,
  },
  counter: {
    flexDirection: 'row',
    gap: 8,
  },
  counterButton: {
    height: 40,
    width: 40,
    borderRadius: 10,
    padding: 0,
    backgroundColor: '#f1f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterDisabled: {
    opacity: 0.4,
  },
  counterText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1c2433',
  },
  liveCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0dcfb',
  },
  liveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  liveTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1c2433',
  },
  guestRow: {
    borderColor: '#e0dcfb',
    backgroundColor: '#faf9ff',
  },
  guestAvatar: {
    backgroundColor: '#efedfd',
  },
  guestName: {
    fontWeight: '600',
    color: '#1c2433',
  },
  joinedTag: {
    backgroundColor: '#efedfd',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  joinedTagText: {
    color: '#5b4ddb',
    fontWeight: '700',
    fontSize: 12,
  },
  liveLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#5b4ddb',
    backgroundColor: '#efedfd',
  },
  liveLinkText: {
    color: '#5b4ddb',
    fontWeight: '800',
    fontSize: 15,
  },
  // --- Live link controls (inline in the live card) ---
  urlPill: {
    backgroundColor: '#eef2f0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  urlText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 15,
    color: '#1c2433',
    textAlign: 'center',
  },
  linkButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1ec873',
  },
  copyButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  shareButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d5dbe2',
    backgroundColor: '#ffffff',
  },
  shareButtonText: {
    color: '#1c2433',
    fontWeight: '800',
    fontSize: 15,
  },
  linkDivider: {
    height: 1,
    backgroundColor: '#eef1f4',
    marginVertical: 18,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joinedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  joinedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1ec873',
  },
  joinedText: {
    color: '#4a5565',
    fontSize: 15,
    fontWeight: '600',
  },
  simulateLink: {
    color: '#1ec873',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  rosterRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  rosterAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1ec873',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  rosterOverlap: {
    marginLeft: -10,
  },
  rosterInitial: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  rosterEmpty: {
    marginTop: 16,
    color: '#9aa8b6',
    fontSize: 14,
  },
  cancelHint: {
    marginTop: 16,
    color: '#9aa8b6',
    fontSize: 12,
    textAlign: 'center',
  },
  sectionLabel: {
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 10,
    color: '#7a8a9b',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputs: {
    marginHorizontal: 16,
    gap: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 56,
    gap: 10,
  },
  avatar: {
    height: 32,
    width: 32,
    borderRadius: 12,
    backgroundColor: '#e6f6ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#16b269',
    fontWeight: '800',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1c2433',
    paddingVertical: 10,
  },
  inputYou: {
    borderColor: '#1ec873',
  },
  removeText: {
    fontSize: 20,
    color: '#c94a4a',
    paddingHorizontal: 4,
  },
  addMore: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  addMoreText: {
    color: '#1c2433',
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    padding: 16,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerButton: {
    width: '80%',
    backgroundColor: '#1ec873',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
  },
  footerText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
});
