import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '../../utils/supabase';

const CONFIRMATION_COOLDOWN_SECONDS = 60;
const RATE_LIMIT_MESSAGE =
  'Too many confirmation emails have been requested. Please wait before trying again.';

function isEmailRateLimitError(error: unknown) {
  if (typeof error !== 'object' || error === null) return false;

  const details = error as { code?: unknown; message?: unknown; status?: unknown };
  return (
    details.code === 'over_email_send_rate_limit' ||
    details.status === 429 ||
    (typeof details.message === 'string' &&
      /rate.?limit|too many requests/i.test(details.message))
  );
}

function getSignUpErrorMessage(error: { code?: string; message: string; status?: number }) {
  const message = error.message.toLowerCase();

  if (isEmailRateLimitError(error)) {
    return RATE_LIMIT_MESSAGE;
  }
  if (
    error.code === 'email_exists' ||
    message.includes('already registered') ||
    message.includes('already been registered')
  ) {
    return 'An account with this email already exists. Sign in instead.';
  }
  if (error.code === 'email_address_invalid' || message.includes('invalid email')) {
    return 'Enter a valid email address.';
  }
  if (message.includes('password')) {
    return 'Your password does not meet the requirements. Use at least 8 characters and try again.';
  }
  return error.message || 'Unable to create your account. Please try again.';
}

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const requestInFlight = useRef(false);
  const cooldownUntil = useRef(0);
  const isCoolingDown = cooldownSeconds > 0;

  useEffect(() => {
    if (!isCoolingDown) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil.current - Date.now()) / 1000));
      setCooldownSeconds(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [isCoolingDown]);

  const startCooldown = () => {
    cooldownUntil.current = Date.now() + CONFIRMATION_COOLDOWN_SECONDS * 1000;
    setCooldownSeconds(CONFIRMATION_COOLDOWN_SECONDS);
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const submit = async () => {
    if (
      requestInFlight.current ||
      registrationComplete ||
      cooldownSeconds > 0 ||
      Date.now() < cooldownUntil.current
    ) {
      return;
    }

    const name = fullName.trim();
    const normalizedEmail = email.trim();

    if (!name || !normalizedEmail || !password || !confirmPassword) {
      setError('Complete all fields to create your account.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Your password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    clearMessages();
    requestInFlight.current = true;
    setIsSubmitting(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (signUpError) {
        if (isEmailRateLimitError(signUpError)) startCooldown();
        setError(getSignUpErrorMessage(signUpError));
      } else if (!data.user) {
        setError('Your account could not be created. Please try again.');
      } else if (data.session) {
        setSuccess('Your account has been created.');
      } else {
        setRegistrationComplete(true);
        setPassword('');
        setConfirmPassword('');
        startCooldown();
        setSuccess(
          'Your account has been created. Check your email to confirm your address before signing in.',
        );
      }
    } catch (registrationError: unknown) {
      if (isEmailRateLimitError(registrationError)) {
        startCooldown();
        setError(RATE_LIMIT_MESSAGE);
      } else {
        setError(
          registrationError instanceof Error
            ? registrationError.message
            : 'Unable to create your account. Please try again.',
        );
      }
    } finally {
      requestInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const resendConfirmation = async () => {
    if (
      requestInFlight.current ||
      !registrationComplete ||
      cooldownSeconds > 0 ||
      Date.now() < cooldownUntil.current
    ) {
      return;
    }

    const normalizedEmail = email.trim();
    if (!normalizedEmail) return;

    clearMessages();
    requestInFlight.current = true;
    setIsResending(true);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
      });

      if (resendError) {
        if (isEmailRateLimitError(resendError)) startCooldown();
        setError(getSignUpErrorMessage(resendError));
      } else {
        startCooldown();
        setSuccess('Confirmation email sent. Check your inbox.');
      }
    } catch (resendError: unknown) {
      if (isEmailRateLimitError(resendError)) {
        startCooldown();
        setError(RATE_LIMIT_MESSAGE);
      } else {
        setError(
          resendError instanceof Error
            ? resendError.message
            : 'Unable to resend the confirmation email. Please try again.',
        );
      }
    } finally {
      requestInFlight.current = false;
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Sign up to get started with Todo App</Text>

          <TextInput
            value={fullName}
            onChangeText={(value) => {
              setFullName(value);
              clearMessages();
            }}
            placeholder="Full Name"
            editable={!registrationComplete}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            style={styles.input}
            testID="full-name"
          />
          <TextInput
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              clearMessages();
            }}
            placeholder="Email Address"
            editable={!registrationComplete}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            style={styles.input}
            testID="signup-email"
          />
          <TextInput
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              clearMessages();
            }}
            placeholder="Password"
            editable={!registrationComplete}
            secureTextEntry={!showPasswords}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            style={styles.input}
            testID="signup-password"
          />
          <TextInput
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              clearMessages();
            }}
            placeholder="Confirm Password"
            editable={!registrationComplete}
            secureTextEntry={!showPasswords}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => void submit()}
            style={styles.input}
            testID="confirm-password"
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showPasswords ? 'Hide passwords' : 'Show passwords'}
            onPress={() => setShowPasswords((visible) => !visible)}
            disabled={registrationComplete}
            style={styles.visibilityButton}
          >
            <Text style={styles.visibilityText}>{showPasswords ? 'Hide password' : 'Show password'}</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => void submit()}
            disabled={isSubmitting || registrationComplete || isCoolingDown}
            style={[
              styles.button,
              (isSubmitting || registrationComplete || isCoolingDown) && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>
              {isSubmitting
                ? 'Creating account...'
                : isCoolingDown && !registrationComplete
                  ? `Try again in ${cooldownSeconds}s`
                  : 'Create Account'}
            </Text>
          </Pressable>

          {registrationComplete ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void resendConfirmation()}
              disabled={isResending || isCoolingDown}
              style={[
                styles.resendButton,
                (isResending || isCoolingDown) && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.resendButtonText}>
                {isResending
                  ? 'Sending...'
                  : isCoolingDown
                    ? `Resend confirmation in ${cooldownSeconds}s`
                    : 'Resend Confirmation'}
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.signinPrompt}>
            <Text style={styles.promptText}>Already have an account? </Text>
            <Link href="/login" style={styles.signinLink}>
              Sign in
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    gap: 12,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#64748b', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  visibilityButton: { alignSelf: 'flex-end', paddingVertical: 2 },
  visibilityText: { color: '#2563eb', fontWeight: '600' },
  error: { color: '#dc2626' },
  success: { color: '#15803d' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resendButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  resendButtonText: { color: '#2563eb', fontWeight: '700', fontSize: 15 },
  signinPrompt: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  promptText: { color: '#64748b', fontSize: 14 },
  signinLink: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
});
