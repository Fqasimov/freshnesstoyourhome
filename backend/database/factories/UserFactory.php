<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'name' => fake()->name(),
            'phone' => '+99450'.fake()->numerify('#######'),
            'locale' => 'az',
            'email_verified_at' => now(),
        ];
    }

    /** A customer who has signed in but not yet filled in name and phone. */
    public function incompleteProfile(): static
    {
        return $this->state(fn () => ['name' => null, 'phone' => null]);
    }

    public function courier(): static
    {
        return $this->afterCreating(fn (User $u) => $u->promote(User::ROLE_COURIER));
    }

    public function admin(): static
    {
        return $this->afterCreating(fn (User $u) => $u->promote(User::ROLE_ADMIN));
    }

    public function blocked(): static
    {
        return $this->afterCreating(fn (User $u) => $u->forceFill(['blocked_at' => now()])->save());
    }
}
