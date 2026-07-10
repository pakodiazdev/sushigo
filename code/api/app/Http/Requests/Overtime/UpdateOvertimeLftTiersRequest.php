<?php

namespace App\Http\Requests\Overtime;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Full-replacement bulk update.
 * The caller sends the complete desired list; the backend replaces all tiers atomically.
 *
 * @OA\Schema(
 *     schema="UpdateOvertimeLftTiersRequest",
 *     title="Update Overtime LFT Tiers Request",
 *     required={"tiers"},
 *
 *     @OA\Property(
 *         property="tiers",
 *         type="array",
 *         minItems=1,
 *
 *         @OA\Items(
 *
 *             @OA\Property(property="factor", type="number", format="float", minimum=0, exclusiveMinimum=true, example=2.0),
 *             @OA\Property(property="up_to_hours", type="number", format="float", nullable=true, minimum=0, exclusiveMinimum=true, example=9.0)
 *         )
 *     )
 * )
 */
class UpdateOvertimeLftTiersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('overtime.manage');
    }

    public function rules(): array
    {
        return [
            'tiers' => ['required', 'array', 'min:1'],
            'tiers.*.factor' => ['required', 'numeric', 'gt:0'],
            'tiers.*.up_to_hours' => ['nullable', 'numeric', 'gt:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $tiers = collect($this->input('tiers', []));

            $bounded = $tiers->filter(fn ($t) => isset($t['up_to_hours']) && $t['up_to_hours'] !== null);
            $unboundedCount = $tiers->count() - $bounded->count();

            if ($unboundedCount > 1) {
                $v->errors()->add('tiers', 'Solo un tramo puede no tener tope de horas (el último).');

                return;
            }

            $hours = $bounded->pluck('up_to_hours')
                ->filter(fn ($h) => is_numeric($h))
                ->map(fn ($h) => (float) $h)
                ->sort()
                ->values();

            if ($hours->duplicates()->isNotEmpty()) {
                $v->errors()->add('tiers', 'Los valores de up_to_hours deben ser únicos.');
            }
        });
    }
}
