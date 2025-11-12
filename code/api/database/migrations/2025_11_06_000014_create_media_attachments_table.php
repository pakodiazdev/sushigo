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
        Schema::create('media_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('media_gallery_id')
                ->constrained('media_galleries')
                ->cascadeOnDelete()
                ->comment('Gallery reference');

            $table->morphs('attachable', 'attachable_idx');
            $table->boolean('is_primary')->default(false)->comment('Whether this is the primary gallery for entity');

            $table->json('meta')->nullable()->comment('Additional metadata');
            $table->timestamps();

            $table->unique(['media_gallery_id', 'attachable_type', 'attachable_id'], 'unique_gallery_attachment');
            $table->index(['attachable_type', 'attachable_id', 'is_primary']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('media_attachments');
    }
};
