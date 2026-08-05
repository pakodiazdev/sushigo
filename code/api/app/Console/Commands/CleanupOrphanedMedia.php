<?php

namespace App\Console\Commands;

use App\Models\MediaGallery;
use App\Services\Media\DeleteMediaAssetService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Deletes MediaGallery rows with no MediaAttachment (never attached, or the
 * form that would have attached them was abandoned) once they're older than
 * the configured grace period — see TD-02
 * (doc/decisions/td-02-media-cleanup-strategy.md) for why this runs at
 * container startup instead of on a recurring schedule.
 */
class CleanupOrphanedMedia extends Command
{
    protected $signature = 'media:cleanup-orphans
        {--dry-run : Preview which galleries would be deleted without deleting them}';

    protected $description = 'Delete orphaned MediaGallery rows (no MediaAttachment) older than the configured grace period';

    public function __construct(private readonly DeleteMediaAssetService $deleteMediaAsset)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $cutoff = now()->subDays((int) config('media.orphan_grace_period_days'));
        $found = false;

        // chunkById (not get()) keeps memory bounded during container startup even with a
        // large backlog, and — unlike offset-based chunk() — stays correct while rows are
        // being deleted mid-iteration, since each batch is fetched by id > lastSeenId.
        MediaGallery::whereDoesntHave('attachments')
            ->where('created_at', '<', $cutoff)
            ->with('mediaAssets')
            ->chunkById(200, function ($galleries) use ($dryRun, &$found) {
                $found = true;

                foreach ($galleries as $gallery) {
                    if ($dryRun) {
                        $this->line("Would delete gallery #{$gallery->id} ({$gallery->mediaAssets->count()} asset(s))");

                        continue;
                    }

                    // Isolated per gallery: TD-02 relies on redundant concurrent runs
                    // (a second container instance sweeping the same backlog) being
                    // safe. An uncaught failure on one gallery — a race, a transient
                    // DB error — must not abort the whole chunk and leave the rest of
                    // the backlog in this run unswept.
                    try {
                        foreach ($gallery->mediaAssets as $asset) {
                            ($this->deleteMediaAsset)($asset);
                        }

                        $gallery->forceDelete();
                        $this->info("Deleted orphaned gallery #{$gallery->id}");
                    } catch (Throwable $e) {
                        Log::warning('media:cleanup-orphans failed to delete a gallery, continuing with the rest of the backlog', [
                            'gallery_id' => $gallery->id,
                            'exception' => $e->getMessage(),
                        ]);
                        $this->warn("Failed to delete gallery #{$gallery->id}: {$e->getMessage()} — continuing");
                    }
                }
            });

        if (! $found) {
            $this->info('No orphaned galleries to clean up.');
        }

        return self::SUCCESS;
    }
}
