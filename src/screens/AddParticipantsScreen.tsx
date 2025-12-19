import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { RootStackParamList } from '../types/navigation';
import { GradientHeader } from '../components/GradientHeader';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddParticipants'>;
type RouteProps = RouteProp<RootStackParamList, 'AddParticipants'>;

export default function AddParticipantsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { items, restaurantName, totals } = route.params;

  const [names, setNames] = useState<string[]>(['You', 'Person 2', 'Person 3']);

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
    if (participants.length === 0) return;

    navigation.navigate('SelectItems', {
      items,
      participants,
      restaurantName,
      totals,
    });
  };

  const canRemove = names.length > 1;

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
              <Text style={styles.cardSubtitle}>{names.length} people</Text>
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

        <Text style={styles.sectionLabel}>Enter names</Text>

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
