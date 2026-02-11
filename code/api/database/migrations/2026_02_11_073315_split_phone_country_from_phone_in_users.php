<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // This migration scans existing users and splits the country code
        // from the phone column into phone_country, leaving phone as the
        // national number (digits only). It is idempotent for rows that
        // already have phone_country set.
        \Illuminate\Support\Facades\DB::table('users')
            ->whereNull('phone_country')
            ->whereNotNull('phone')
            ->orderBy('id')
            ->chunk(100, function ($users) {
                foreach ($users as $u) {
                    $phone = trim($u->phone);
                    if ($phone === '') {
                        continue;
                    }

                    // Normalize: remove spaces, dashes, parentheses
                    $normalized = preg_replace('/[^0-9+]/', '', $phone);

                    $country = null;
                    $national = $normalized;

                    // Case 1: starts with + -> +{country}{rest}
                    if (str_starts_with($normalized, '+')) {
                        // Extract +<country digits> (1-4) and the rest as national
                        if (preg_match('/^\+([0-9]{1,4})([0-9]{6,})$/', $normalized, $m)) {
                            $country = '+' . $m[1];
                            $national = $m[2];
                        }
                    } else {
                        // Case 2: starts with country digits (like 52) and length > 10
                        if (preg_match('/^([0-9]{1,4})([0-9]{6,})$/', $normalized, $m)) {
                            // Heuristic: if the rest is 10 digits (typical MX), treat first group as country
                            $rest = $m[2];
                            $prefix = $m[1];
                            if (strlen($rest) === 10) {
                                $country = '+' . $prefix;
                                $national = $rest;
                            }
                        }
                    }

                    // If we couldn't parse a country, set default from config when phone looks national
                    if ($country === null) {
                        // If national part already looks like 10 digits, assume +52
                        $onlyDigits = preg_replace('/\D/', '', $normalized);
                        if (strlen($onlyDigits) === 10) {
                            $country = config('employees.default_phone_country', '+52');
                            $national = $onlyDigits;
                        }
                    }

                    if ($country !== null) {
                        \Illuminate\Support\Facades\DB::table('users')
                            ->where('id', $u->id)
                            ->update([
                                'phone_country' => $country,
                                'phone' => $national,
                            ]);
                    } else {
                        // Ensure phone is digits-only
                        $onlyDigits = preg_replace('/\D/', '', $normalized);
                        \Illuminate\Support\Facades\DB::table('users')
                            ->where('id', $u->id)
                            ->update(['phone' => $onlyDigits ?: null]);
                    }
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // We do not attempt to reverse data normalization.
    }
};
