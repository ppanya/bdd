import 'package:flutter/material.dart';
import 'home_screen.dart';

const _validUsername = 'testuser';
const _validPassword = 'correctpassword';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  String? _errorMessage;

  bool get _canSubmit =>
      _usernameController.text.isNotEmpty &&
      _passwordController.text.isNotEmpty;

  void _onLogin() {
    if (_usernameController.text == _validUsername &&
        _passwordController.text == _validPassword) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    } else {
      setState(() => _errorMessage = 'รหัสผ่านไม่ถูกต้อง');
    }
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Semantics(identifier) → UIAutomator2: ~login_username_field
            Semantics(
              identifier: 'login_username_field',
              child: TextField(
                controller: _usernameController,
                decoration: const InputDecoration(
                  labelText: 'Username',
                  border: OutlineInputBorder(),
                ),
                onChanged: (_) => setState(() => _errorMessage = null),
              ),
            ),
            const SizedBox(height: 16),
            Semantics(
              identifier: 'login_password_field',
              child: TextField(
                controller: _passwordController,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                ),
                obscureText: true,
                onChanged: (_) => setState(() => _errorMessage = null),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 24,
              child: _errorMessage != null
                  ? Semantics(
                      identifier: 'login_error_message',
                      child: Text(
                        _errorMessage!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
            const SizedBox(height: 16),
            Semantics(
              identifier: 'login_submit_button',
              child: ElevatedButton(
                onPressed: _canSubmit ? _onLogin : null,
                child: const Text('Login'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
