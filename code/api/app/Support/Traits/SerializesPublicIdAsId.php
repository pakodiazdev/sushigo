<?php

namespace App\Support\Traits;

trait SerializesPublicIdAsId
{
    /**
     * Replace the numeric primary key with the ULID public_id under the
     * 'id' key in array/JSON output — applies everywhere the model gets
     * serialized (Show/Update responses, paginated List responses, and
     * nested relations on other models using this same trait), without
     * requiring a dedicated API Resource class per model. The numeric id
     * remains the real primary key for internal use (queries, FKs); only
     * the serialized representation changes.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $array = parent::toArray();

        $array['id'] = $this->public_id;
        unset($array['public_id']);

        return $array;
    }
}
