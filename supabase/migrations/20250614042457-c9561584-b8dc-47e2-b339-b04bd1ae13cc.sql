
-- Fix the RLS policy for INSERT operations on student_goals table
-- This will allow authenticated users to create goals where they are the student

-- Drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can create their own goals" ON public.student_goals;

-- Create the correct INSERT policy
CREATE POLICY "Users can create their own goals" 
  ON public.student_goals 
  FOR INSERT 
  WITH CHECK (auth.uid() = student_id);

-- Also ensure we have the correct SELECT policy
DROP POLICY IF EXISTS "Users can view their own goals" ON public.student_goals;
CREATE POLICY "Users can view their own goals" 
  ON public.student_goals 
  FOR SELECT 
  USING (auth.uid() = student_id);

-- And UPDATE policy
DROP POLICY IF EXISTS "Users can update their own goals" ON public.student_goals;
CREATE POLICY "Users can update their own goals" 
  ON public.student_goals 
  FOR UPDATE 
  USING (auth.uid() = student_id);

-- And DELETE policy
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.student_goals;
CREATE POLICY "Users can delete their own goals" 
  ON public.student_goals 
  FOR DELETE 
  USING (auth.uid() = student_id);
