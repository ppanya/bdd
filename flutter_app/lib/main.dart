import 'package:flutter/material.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(const BddPocApp());
}

class BddPocApp extends StatelessWidget {
  const BddPocApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BDD POC',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}
