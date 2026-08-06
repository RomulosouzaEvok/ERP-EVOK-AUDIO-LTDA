/**
 * Augmentação de tipos para as props específicas de TV expostas pelo fork
 * `react-native-tvos` (aliasado como `react-native` neste projeto — ver
 * `package.json`). O pacote `@types/react-native` embutido no Expo/RN core
 * não conhece essas props (`hasTVPreferredFocus`, `isTVSelectable`), então
 * declaramos aqui para manter `tsc --noEmit` limpo sem recorrer a `any`
 * espalhado pelo código.
 *
 * Referência: https://github.com/react-native-tvos/react-native-tvos —
 * seção "TV specific props" (Pressable, Touchable-family, TextInput, View).
 */

import 'react-native';

declare module 'react-native' {
  interface TextInputProps {
    /** Dá foco automático a este campo ao entrar na tela (D-pad), em builds de TV. */
    hasTVPreferredFocus?: boolean;
  }

  interface PressableProps {
    hasTVPreferredFocus?: boolean;
    isTVSelectable?: boolean;
  }
}
