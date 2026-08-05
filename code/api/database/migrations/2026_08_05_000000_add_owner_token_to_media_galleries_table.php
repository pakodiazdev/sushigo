<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Client-generated opaque token, captured only when a gallery is
     * created unattached (no media_gallery_id given to POST /media/upload).
     * Until the gallery is attached to a real entity, this is the only
     * ownership signal available — see MediaGallery::isManageableBy().
     */
    public function up(): void
    {
        Schema::table('media_galleries', function (Blueprint $table) {
            $table->string('owner_token', 100)->nullable()->after('is_shared')
                ->comment('Client-generated token authorizing further edits while the gallery is unattached');
        });
    }

    public function down(): void
    {
        Schema::table('media_galleries', function (Blueprint $table) {
            $table->dropColumn('owner_token');
        });
    }
};
