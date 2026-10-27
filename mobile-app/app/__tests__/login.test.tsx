import React from 'react';
import { Keyboard, StyleSheet } from 'react-native';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import LoginScreen from '../login';

const mockLogin = jest.fn();
const mockApiGet = jest.fn();
let mockConnectionState: 'checking' | 'online' | 'no_network' | 'service_unavailable' = 'online';

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

jest.mock('@/context/ConnectionContext', () => ({
  useConnection: () => ({ state: mockConnectionState, retry: jest.fn(), lastOnlineAt: Date.now() }),
}));

jest.mock('@/utils/api', () => ({
  api: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

jest.mock('expo-linear-gradient', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMock = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactMock.createElement(View, props, children),
  };
});

jest.mock('react-native-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMock = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactMock.createElement(View, props, children),
    Path: ({ d, fill }: { d: string; fill: string }) =>
      ReactMock.createElement(View, {
        testID: 'login_hero_curve_path',
        accessibilityLabel: d,
        accessibilityValue: { text: fill },
      }),
  };
});

jest.mock('@/components/ui/PasswordResetOverlay', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMock = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible }: { visible: boolean }) => visible
      ? ReactMock.createElement(View, { testID: 'password-reset-overlay' })
      : null,
  };
});

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Keyboard, View } = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMock = require('react');
  return {
    __esModule: true,
    default: { View },
    View,
    Extrapolate: { CLAMP: 'clamp' },
    interpolate: (_value: number, _input: number[], output: number[]) => output[0],
    useAnimatedStyle: (createStyle: () => object) => createStyle(),
    useSharedValue: (value: number) => ({ value }),
    useAnimatedKeyboard: () => {
      const [height, setHeight] = ReactMock.useState(0);
      ReactMock.useEffect(() => {
        const showSubscription = Keyboard.addListener('keyboardWillShow', (event: { endCoordinates?: { height?: number } }) => {
          setHeight(event.endCoordinates?.height ?? 0);
        });
        const hideSubscription = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
        return () => {
          showSubscription.remove();
          hideSubscription.remove();
        };
      }, []);
      return { height: { value: height } };
    },
    withSpring: (value: number) => value,
    withTiming: (value: number) => value,
    withSequence: (...values: number[]) => values[values.length - 1],
    ReduceMotion: { System: 'system' },
  };
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

beforeEach(() => {
  mockConnectionState = 'online';
  mockApiGet.mockReturnValue(new Promise(() => undefined));
  mockLogin.mockResolvedValue({ success: true, requirePasswordReset: false });
});

describe('mobile login screen', () => {
  it('keeps the branded login available while checking connectivity', () => {
    mockConnectionState = 'checking';
    const { getByText, getByTestId } = render(<LoginScreen />);

    expect(getByText('Checking connection')).toBeTruthy();
    expect(getByTestId('login_brand_lockup')).toBeTruthy();
    expect(getByTestId('login_email_input')).toBeTruthy();
  });

  it('renders the supplied hero and wordmark on the email step', () => {
    const { getByTestId } = render(<LoginScreen />);

    const hero = getByTestId('login_hero_image');
    expect(within(hero).getByTestId('login_hero_rider').props.source).toBeDefined();
    const brandLockup = within(hero).getByTestId('login_brand_lockup');
    const brandWordmark = within(brandLockup).getByTestId('login_brand_wordmark');
    const heroMessage = within(brandLockup).getByTestId('login_hero_message');
    expect(StyleSheet.flatten(brandWordmark.props.style).height).toBeGreaterThan(140);
    expect(StyleSheet.flatten(heroMessage.props.style).marginTop).toBeLessThan(0);
    const formCard = getByTestId('login_form_card');
    expect(within(formCard).queryByTestId('login_brand_wordmark')).toBeNull();
    const formCardStyle = StyleSheet.flatten(formCard.props.style);
    expect(formCardStyle.borderWidth).toBe(0);
    expect(formCardStyle.backgroundColor).toBe('#F8FAFC');
    expect(formCardStyle.shadowColor).toBeUndefined();
    expect(formCardStyle.elevation).toBeUndefined();
    expect(StyleSheet.flatten(getByTestId('login_footer_image').props.style).height).toBeGreaterThan(300);
    expect(getByTestId('login_hero_curve')).toBeTruthy();
    expect(getByTestId('login_hero_curve_path').props.accessibilityLabel).toBe(
      'M 0 25 C 80 -5, 135 45, 215 25 C 290 5, 345 5, 400 25 L 400 65 L 0 65 Z',
    );
    expect(getByTestId('login_hero_curve_path').props.accessibilityValue.text).toBe('#F8FAFC');
    expect(getByTestId('login_email_input')).toBeTruthy();
  });

  it('places a keyboard-aware scroll view around the login form', () => {
    const { getByTestId } = render(<LoginScreen />);
    const keyboardContainer = getByTestId('login_keyboard_container');
    const scrollView = within(keyboardContainer).getByTestId('login_scroll_view');

    expect(scrollView.props.keyboardShouldPersistTaps).toBe('handled');
    expect(scrollView.props.automaticallyAdjustKeyboardInsets).toBe(false);
  });

  it('keeps the illustrated hero stationary and raises an opaque cover with the keyboard', () => {
    const subscriptions: Record<string, (event: unknown) => void> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((eventName: string, listener: (event: unknown) => void) => {
      subscriptions[eventName] = listener;
      return { remove: jest.fn() } as any;
    }) as typeof Keyboard.addListener);

    const { getByTestId, queryByTestId } = render(<LoginScreen />);
    const initialHeroHeight = StyleSheet.flatten(getByTestId('login_hero_image').props.style).height;
    const initialHeroTopPadding = StyleSheet.flatten(getByTestId('login_hero_top_row').props.style).paddingTop;

    act(() => (subscriptions.keyboardWillShow || subscriptions.keyboardDidShow)?.({ endCoordinates: { height: 300 } }));

    expect(StyleSheet.flatten(getByTestId('login_hero_image').props.style).height).toBe(initialHeroHeight);
    expect(StyleSheet.flatten(getByTestId('login_hero_top_row').props.style).paddingTop).toBe(initialHeroTopPadding);
    expect(StyleSheet.flatten(getByTestId('login_keyboard_cover').props.style).height).toBeGreaterThan(0);
    expect(getByTestId('login_footer_image')).toBeTruthy();
    expect(queryByTestId('login_hero_message')).toBeTruthy();
  });

  it('keeps the login form mounted and disables duplicate submissions while authentication is pending', async () => {
    let resolveLogin: ((result: { success: boolean; requirePasswordReset: boolean }) => void) | undefined;
    mockLogin.mockImplementation(() => new Promise((resolve) => { resolveLogin = resolve; }));
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
    fireEvent.press(getByTestId('login_continue_button'));
    const pin = await waitFor(() => getByTestId('login_pin_input'));
    fireEvent.changeText(pin, '1234');
    fireEvent.press(getByTestId('login_sign_in_button'));
    fireEvent.press(getByTestId('login_sign_in_button'));

    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(getByTestId('login_pin_input')).toBeTruthy();
    expect(getByTestId('login_sign_in_button').props.accessibilityState.disabled).toBe(true);
    expect(getByTestId('login_submit_spinner')).toBeTruthy();

    await act(async () => { resolveLogin?.({ success: false, requirePasswordReset: false }); });
    expect(getByTestId('login_pin_input')).toBeTruthy();
  });

  it('keeps the success loading state visible when authentication succeeds before route replacement', async () => {
    let resolveLogin: ((result: { success: boolean; requirePasswordReset: boolean }) => void) | undefined;
    mockLogin.mockImplementation(() => new Promise((resolve) => { resolveLogin = resolve; }));
    const { getByTestId, queryByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
    fireEvent.press(getByTestId('login_continue_button'));
    const pin = await waitFor(() => getByTestId('login_pin_input'));
    fireEvent.changeText(pin, '1234');
    fireEvent.press(getByTestId('login_sign_in_button'));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    await act(async () => { resolveLogin?.({ success: true, requirePasswordReset: false }); });
    expect(getByTestId('login_pin_input')).toBeTruthy();
    expect(getByTestId('login_submit_spinner')).toBeTruthy();
    expect(queryByTestId('login_pin_slot_0')).toBeTruthy();
  });

  it('shows an email validation message before moving to PIN entry', () => {
    const { getByTestId, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('login_email_input'), 'not-an-email');
    fireEvent.press(getByTestId('login_continue_button'));

    expect(getByText('Please enter a valid email address')).toBeTruthy();
  });

  it('accepts four concealed digits and signs in only after an explicit tap', async () => {
    const { getByTestId, getAllByTestId, queryByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
    fireEvent.press(getByTestId('login_continue_button'));
    const pin = await waitFor(() => getByTestId('login_pin_input'));

    expect(queryByTestId('login_parcel_mark')).toBeNull();
    expect(getAllByTestId(/^login_pin_slot_/)).toHaveLength(4);
    expect(pin.props.maxLength).toBe(4);
    expect(pin.props.secureTextEntry).toBe(true);
    fireEvent.changeText(pin, '0001');
    expect(mockLogin).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('login_sign_in_button'));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('rider@company.com', 'rider1', false));
  });

  it('passes the keep-signed-in choice when the rider opts in', async () => {
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
    fireEvent.press(getByTestId('login_continue_button'));
    const pinOptions = await waitFor(() => getByTestId('login_pin_options_row'));
    expect(within(pinOptions).getByText('Keep me signed in')).toBeTruthy();
    expect(within(pinOptions).getByText('Forgot your PIN?')).toBeTruthy();
    const keepSignedIn = await waitFor(() => getByTestId('login_keep_signed_in_checkbox'));
    expect(keepSignedIn.props.accessibilityState.checked).toBe(false);
    fireEvent.press(keepSignedIn);
    fireEvent.changeText(getByTestId('login_pin_input'), '1234');
    fireEvent.press(getByTestId('login_sign_in_button'));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('rider@company.com', 'rider1', true));
  });

  it('filters non-digits and limits the PIN to four characters', async () => {
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
    fireEvent.press(getByTestId('login_continue_button'));
    const pin = await waitFor(() => getByTestId('login_pin_input'));

    fireEvent.changeText(pin, '12x3456');

    expect(pin.props.value).toBe('1234');
    expect(getByTestId('login_pin_slot_3').props.accessibilityLabel).toBe('PIN digit 4');
  });

  it('returns to email and clears the PIN when Change is pressed', async () => {
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
    fireEvent.press(getByTestId('login_continue_button'));
    const pin = await waitFor(() => getByTestId('login_pin_input'));
    fireEvent.changeText(pin, '1234');

    fireEvent.press(getByTestId('login_change_email_button'));
    fireEvent.press(getByTestId('login_continue_button'));

    const clearedPin = await waitFor(() => getByTestId('login_pin_input'));
    expect(clearedPin.props.value).toBe('');
  });

  it('shows authentication failures and exits the signing-in state', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Account is not active' });
    const { getByTestId, getByText, queryByText } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
    fireEvent.press(getByTestId('login_continue_button'));
    const pin = await waitFor(() => getByTestId('login_pin_input'));
    fireEvent.changeText(pin, '1234');
    fireEvent.press(getByTestId('login_sign_in_button'));

    expect(await waitFor(() => getByText('Account is not active'))).toBeTruthy();
    expect(queryByText('Signing you in…')).toBeNull();
  });

  it('opens the existing reset flow when the server requires a password reset', async () => {
    mockLogin.mockResolvedValue({ success: false, requirePasswordReset: true, userId: 'rider-1' });
    const { getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
    fireEvent.press(getByTestId('login_continue_button'));
    const pin = await waitFor(() => getByTestId('login_pin_input'));
    fireEvent.changeText(pin, '1234');
    fireEvent.press(getByTestId('login_sign_in_button'));

    expect(await waitFor(() => getByTestId('password-reset-overlay'))).toBeTruthy();
  });
});
