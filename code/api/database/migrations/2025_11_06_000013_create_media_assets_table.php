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
        Schema::create('media_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('media_gallery_id')
                ->constrained('media_galleries')
                ->cascadeOnDelete()
                ->comment('Parent gallery reference');
            
            $table->string('path', 500)->comment('Storage path to file');
            $table->string('mime_type', 100)->comment('File MIME type');
            $table->string('filename', 255)->comment('Original filename');
            $table->unsignedBigInteger('size')->default(0)->comment('File size in bytes');
            
            $table->integer('position')->default(0)->comment('Display order within gallery');
            $table->boolean('is_primary')->default(false)->comment('Whether this is the primary image');
            
            $table->json('meta')->nullable()->comment('Additional metadata (transformations, dimensions, etc.)');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['media_gallery_id', 'position']);
            $table->index(['media_gallery_id', 'is_primary']);
        });

        // Add foreign key constraint for cover_media_id after media_assets table exists
        Schema::table('media_galleries', function (Blueprint $table) {
            $table->foreign('cover_media_id')
                ->references('id')
                ->on('media_assets')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('media_galleries', function (Blueprint $table) {
            $table->dropForeign(['cover_media_id']);
        });
        
        Schema::dropIfExists('media_assets');
    }
};
