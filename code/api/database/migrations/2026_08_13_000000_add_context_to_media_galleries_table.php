<?php

use App\Models\Dish;
use App\Models\Item;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Declares which config('media.contexts') key a gallery was created for —
     * POST /media/upload now requires it on a new gallery and validates the
     * file against that context's allowed extensions, closing the gap where
     * every adopter (Item, Dish, User/avatar) shared one global extension
     * list regardless of what it was actually for (e.g. an employee avatar
     * accepting the same video formats as an Item photo, see #401 review).
     * Nullable: existing unattached galleries have no reliable context to
     * infer and are left alone — they age out via media:cleanup-orphans.
     */
    public function up(): void
    {
        Schema::table('media_galleries', function (Blueprint $table) {
            $table->string('context')->nullable()->after('is_shared')
                ->comment('config(media.contexts) key this gallery was created for');
        });

        // Backfill from the current attachment, where one exists — an already-attached
        // gallery's context is unambiguous even though the column didn't exist yet.
        foreach ([Item::class => 'item', Dish::class => 'dish', User::class => 'avatar'] as $attachableType => $context) {
            DB::table('media_galleries')
                ->whereIn('id', function ($query) use ($attachableType) {
                    $query->select('media_gallery_id')
                        ->from('media_attachments')
                        ->where('attachable_type', $attachableType);
                })
                ->update(['context' => $context]);
        }
    }

    public function down(): void
    {
        Schema::table('media_galleries', function (Blueprint $table) {
            $table->dropColumn('context');
        });
    }
};
