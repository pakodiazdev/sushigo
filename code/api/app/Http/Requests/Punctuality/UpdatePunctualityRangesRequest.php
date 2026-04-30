<?php

namespace App\Http\Requests\Punctuality;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Full-replacement bulk update.
 * The caller sends the complete desired list; the backend replaces all ranges atomically.
 *
 * @OA\Schema(
 *     schema="UpdatePunctualityRangesRequest",
 *     title="Update Punctuality Ranges Request",
 *     required={"ranges"},
 *
 *     @OA\Property(
 *         property="ranges",
 *         type="array",
 *         minItems=1,
 *
 *         @OA\Items(
 *
 *             @OA\Property(property="min_seconds", type="integer", minimum=0, example=0),
 *             @OA\Property(property="bonus_percentage", type="number", format="float", minimum=0, maximum=100, example=100.0)
 *         )
 *     )
 * )
 */
class UpdatePunctualityRangesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('punctuality.manage');
    }

    public function rules(): array
    {
        return [
            'ranges' => ['required', 'array', 'min:1'],
            'ranges.*.min_seconds' => ['required', 'integer', 'min:0'],
            'ranges.*.bonus_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $ranges = collect($this->input('ranges', []))
                ->pluck('min_seconds')
                ->filter(fn ($s) => is_numeric($s))
                ->map(fn ($s) => (int) $s)
                ->sort()
                ->values();

            if ($ranges->isEmpty()) {
                return;
            }

            if ($ranges->first() !== 0) {
                $v->errors()->add('ranges.0.min_seconds', 'El primer rango debe comenzar en 0 segundos.');
            }

            $dupes = $ranges->duplicates();
            if ($dupes->isNotEmpty()) {
                $v->errors()->add('ranges', 'Los valores de min_seconds deben ser únicos.');
            }
        });
    }
}
