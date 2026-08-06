/**
 * Botão navegável por controle remoto (D-pad).
 *
 * Em `react-native-tvos`, qualquer `Pressable` já recebe foco por D-pad
 * automaticamente quando rodando em uma build de TV (`isTVSelectable`), e
 * dispara `onFocus`/`onBlur` — a mesma API de foco usada no restante do
 * React Native. Aqui usamos isso para dar destaque visual claro (borda +
 * leve zoom) ao item focado, essencial em "10-foot UI" onde não há
 * cursor/toque para indicar onde a seleção está.
 *
 * `hasTVPreferredFocus` (repassado via prop) define o elemento que recebe
 * foco automaticamente ao entrar na tela — ver
 * https://reactnative.dev/docs/pressable#appleplatform-1 (TV-specific props
 * documentadas no fork react-native-tvos, compatíveis com a API padrão).
 */

import { useState } from 'react';
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

interface FocusablePressableProps {
  onPress: (event: GestureResponderEvent) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  focusedStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  hasTVPreferredFocus?: boolean;
}

export default function FocusablePressable({
  onPress,
  children,
  style,
  focusedStyle,
  disabled,
  hasTVPreferredFocus,
}: FocusablePressableProps) {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      // Props específicas de TV (react-native-tvos): dão foco automático a
      // este elemento ao entrar na tela, e habilitam seleção por D-pad.
      // Tipadas em `src/types/react-native-tv.d.ts`.
      hasTVPreferredFocus={hasTVPreferredFocus}
      isTVSelectable
      style={({ pressed }) => [
        style,
        focused && (focusedStyle ?? styles.defaultFocused),
        pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  defaultFocused: {
    borderColor: '#38BDF8',
    borderWidth: 3,
    transform: [{ scale: 1.03 }],
  },
  pressed: {
    opacity: 0.85,
  },
});
