import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

/**
 * Initialize and return the Supabase client
 * This function fetches the config from Electron's main process
 */
export async function getSupabaseClient() {
  // If already initialized, return it
  if (supabaseClient) {
    return supabaseClient;
  }

  // Get config from Electron main process
  const config = await window.api.getSupabaseConfig();
  
  if (!config.url || !config.anonKey) {
    throw new Error('Supabase configuration is missing. Please check your .env file.');
  }

  // Create and cache the Supabase client
  supabaseClient = createClient(config.url, config.anonKey);
  return supabaseClient;
}

/**
 * Example function to test Supabase connection
 */
export async function testSupabaseConnection() {
  try {
    const supabase = await getSupabaseClient();
    // You can test the connection by listing tables or running a simple query
    // Example: const { data, error } = await supabase.from('your_table').select('*').limit(1);
    return { success: true, message: 'Supabase client initialized successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * List all schedules from Supabase
 */
export async function listSchedules() {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data.map(schedule => ({
      id: schedule.id,
      name: schedule.name || schedule.id,
      createdAt: schedule.created_at,
      updatedAt: schedule.updated_at
    }));
  } catch (error) {
    console.error('Error listing schedules from Supabase:', error);
    throw error;
  }
}

/**
 * Get a schedule with its blocks from Supabase
 */
export async function getSchedule(scheduleId) {
  try {
    const supabase = await getSupabaseClient();
    
    // Get schedule
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (scheduleError && scheduleError.code !== 'PGRST116') { // PGRST116 = not found
      throw scheduleError;
    }

    if (!scheduleData) {
      return null;
    }

    // Get blocks for this schedule
    const { data: blocksData, error: blocksError } = await supabase
      .from('blocks')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('created_at', { ascending: false });

    if (blocksError) {
      throw blocksError;
    }

    return {
      id: scheduleData.id,
      name: scheduleData.name || scheduleData.id,
      createdAt: scheduleData.created_at,
      updatedAt: scheduleData.updated_at,
      blocks: (blocksData || []).map(block => ({
        id: block.id,
        title: block.title || '',
        room: block.room || '',
        teacher: block.teacher || '',
        createdAt: block.created_at,
        updatedAt: block.updated_at
      }))
    };
  } catch (error) {
    console.error('Error getting schedule from Supabase:', error);
    throw error;
  }
}

/**
 * Create or update a schedule in Supabase
 */
export async function saveSchedule(schedule) {
  try {
    const supabase = await getSupabaseClient();
    const now = new Date().toISOString();

    // Prepare schedule data
    const scheduleData = {
      id: schedule.id,
      name: schedule.name || schedule.id,
      updated_at: now
    };

    // If it's a new schedule, set created_at
    if (!schedule.createdAt) {
      scheduleData.created_at = now;
    } else {
      scheduleData.created_at = schedule.createdAt;
    }

    // Upsert schedule (insert or update)
    const { data: scheduleResult, error: scheduleError } = await supabase
      .from('schedules')
      .upsert(scheduleData, { onConflict: 'id' })
      .select()
      .single();

    if (scheduleError) {
      throw scheduleError;
    }

    // Handle blocks - delete existing blocks and insert new ones
    // First, delete all existing blocks for this schedule
    const { error: deleteError } = await supabase
      .from('blocks')
      .delete()
      .eq('schedule_id', schedule.id);

    if (deleteError) {
      throw deleteError;
    }

    // Insert new blocks if any
    if (schedule.blocks && schedule.blocks.length > 0) {
      const blocksData = schedule.blocks.map(block => ({
        id: block.id,
        schedule_id: schedule.id,
        title: block.title || '',
        room: block.room || '',
        teacher: block.teacher || '',
        created_at: block.createdAt || now,
        updated_at: block.updatedAt || now
      }));

      const { error: blocksError } = await supabase
        .from('blocks')
        .insert(blocksData);

      if (blocksError) {
        throw blocksError;
      }
    }

    return { success: true, schedule: scheduleResult };
  } catch (error) {
    console.error('Error saving schedule to Supabase:', error);
    throw error;
  }
}

/**
 * Create a new block in Supabase
 */
export async function createBlock(scheduleId, block) {
  try {
    const supabase = await getSupabaseClient();
    const now = new Date().toISOString();

    const blockData = {
      id: block.id,
      schedule_id: scheduleId,
      title: block.title || '',
      room: block.room || '',
      teacher: block.teacher || '',
      created_at: block.createdAt || now,
      updated_at: block.updatedAt || now
    };

    const { data, error } = await supabase
      .from('blocks')
      .insert(blockData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update schedule's updated_at timestamp
    await supabase
      .from('schedules')
      .update({ updated_at: now })
      .eq('id', scheduleId);

    return {
      id: data.id,
      title: data.title || '',
      room: data.room || '',
      teacher: data.teacher || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error creating block in Supabase:', error);
    throw error;
  }
}

/**
 * Update a block in Supabase
 */
export async function updateBlock(block) {
  try {
    const supabase = await getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('blocks')
      .update({
        title: block.title || '',
        room: block.room || '',
        teacher: block.teacher || '',
        updated_at: now
      })
      .eq('id', block.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update schedule's updated_at timestamp
    if (data.schedule_id) {
      await supabase
        .from('schedules')
        .update({ updated_at: now })
        .eq('id', data.schedule_id);
    }

    return {
      id: data.id,
      title: data.title || '',
      room: data.room || '',
      teacher: data.teacher || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error updating block in Supabase:', error);
    throw error;
  }
}

/**
 * Delete a block from Supabase
 */
export async function deleteBlock(blockId, scheduleId) {
  try {
    const supabase = await getSupabaseClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('id', blockId);

    if (error) {
      throw error;
    }

    // Update schedule's updated_at timestamp
    if (scheduleId) {
      await supabase
        .from('schedules')
        .update({ updated_at: now })
        .eq('id', scheduleId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting block from Supabase:', error);
    throw error;
  }
}

