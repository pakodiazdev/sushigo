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
        Schema::create('media_galleries', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255)->comment('Gallery display name');
            $table->text('description')->nullable()->comment('Gallery description');
            $table->foreignId('cover_media_id')
                ->nullable()
                ->comment('Cover/primary media asset ID');
            
            $table->boolean('is_shared')->default(false)->comment('Whether gallery can be reused');
            $table->json('meta')->nullable()->comment('Additional metadata');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_shared']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('media_galleries');
    }
};
