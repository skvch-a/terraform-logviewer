# Manual Testing Plan for New Features

This document describes how to manually test each of the 4 implemented features.

## Prerequisites

1. Start the backend server:
   ```bash
   cd backend
   python3 -m uvicorn app.main:app --reload
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm start
   ```

3. Have a sample Terraform log file ready for testing

## Test Task 1: Lazy Loading for Request Groups

### Test Case 1.1: Lazy Loading Default Behavior
1. **Setup**: Upload a Terraform log file with multiple request IDs
2. **Action**: Navigate to "Database Logs" tab
3. **Expected Result**: 
   - Should see collapsed groups showing "Request ID: XXX (N entries)"
   - Groups should NOT be open by default
   - Each group should show timestamp information
   - Should NOT see the actual log entries yet

### Test Case 1.2: Loading Logs on Demand
1. **Action**: Click to open/expand a request group
2. **Expected Result**:
   - Should see "Loading logs..." message briefly
   - Logs for that request ID should load and display
   - Subsequent opens/closes should use cached data (no reload)

### Test Case 1.3: Lazy Loading with Filters
1. **Action**: Apply any filter (e.g., select a log level)
2. **Expected Result**:
   - Should switch to regular mode (not lazy loading)
   - Groups should be open by default
   - All filtered logs should be visible immediately

## Test Task 2: Disable Grouping by request_id

### Test Case 2.1: Grouping Toggle
1. **Setup**: Upload logs and view them
2. **Action**: Click "📋 Disable Grouping" button
3. **Expected Result**:
   - All logs should display in a flat list
   - Logs should be sorted by timestamp (not grouped)
   - Each log should show its request_id as metadata
   - Button text should change to "📋 Enable Grouping"

### Test Case 2.2: Re-enable Grouping
1. **Action**: Click "📋 Enable Grouping" button
2. **Expected Result**:
   - Logs should return to grouped view
   - Groups should be organized by request_id
   - Button text should change back to "📋 Disable Grouping"

### Test Case 2.3: Grouping Persists with Filters
1. **Action**: Disable grouping, then apply a filter
2. **Expected Result**:
   - Logs should remain in flat view
   - Filter should be applied to flat list
   - Grouping state should persist

## Test Task 3: Warning for Fixed Logs

### Test Case 3.1: Upload Clean Logs
1. **Setup**: Upload a log file where all entries have @level and @timestamp
2. **Expected Result**:
   - Success message should appear
   - Should NOT see any warning about fixed logs
   - Message: "Success! Uploaded N log entries from filename.log"

### Test Case 3.2: Upload Logs with Missing Fields
1. **Setup**: Upload a log file with some entries missing @level or @timestamp
2. **Expected Result**:
   - Success message should include a warning
   - Warning should show: "⚠️ Warning: N log entries had missing fields that were automatically restored."
   - Warning should be displayed inline with success message

### Test Case 3.3: Warning in Sections View
1. **Action**: Navigate to "Sections Parser" tab after uploading logs with missing fields
2. **Expected Result**:
   - If logs were fixed, warning should appear in sections view too
   - Message should indicate how many logs were fixed

## Test Task 4: Sections Parser Using Database

### Test Case 4.1: Sections View Before Upload
1. **Action**: Navigate to "Sections Parser" tab (before uploading any logs)
2. **Expected Result**:
   - Should see FileUpload component at the top
   - Should see "Refresh Data" button
   - Should see message: "No logs found in database. Please upload a log file first."

### Test Case 4.2: Upload and Auto-Refresh
1. **Action**: Upload a log file using the FileUpload component
2. **Expected Result**:
   - Logs should be saved to database
   - Sections view should automatically refresh
   - Should see parsed sections from the uploaded data
   - Should see summary showing total logs and sections found

### Test Case 4.3: Manual Refresh
1. **Setup**: Have logs already in database
2. **Action**: Click "Refresh Data" button
3. **Expected Result**:
   - Should reload sections data from database
   - Should see loading state briefly
   - Data should refresh successfully

### Test Case 4.4: Sections Match Between Views
1. **Setup**: Upload logs to database
2. **Action**: 
   - View logs in "Database Logs" tab
   - Switch to "Sections Parser" tab
3. **Expected Result**:
   - Both views should show data from the same source
   - Sections parser should analyze the same logs
   - Filename should match in both views

### Test Case 4.5: No Separate File Upload
1. **Action**: Check the Sections Parser interface
2. **Expected Result**:
   - Should NOT see a separate file input in the middle of the page
   - Only FileUpload component at top (shared with other views)
   - Should NOT require re-uploading the file to see sections

## Cross-Feature Integration Tests

### Integration Test 1: All Features Together
1. **Action**: Upload logs → Enable lazy loading → Disable grouping → Check sections
2. **Expected Result**: All features should work together without conflicts

### Integration Test 2: Data Consistency
1. **Action**: 
   - Upload logs in "Database Logs" view
   - Switch to "Sections Parser"
   - Switch to "Gantt Chart"
   - Return to "Database Logs"
2. **Expected Result**: All views should show consistent data from the same database

### Integration Test 3: Session Reset
1. **Action**: Click "Reset Session" button
2. **Expected Result**:
   - All logs should be cleared from database
   - All views should show "no data" messages
   - Lazy loading should show empty list
   - Sections parser should prompt to upload

## Browser Compatibility

Test the application in:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Performance Testing

### Performance Test 1: Large Log Files
1. **Action**: Upload a log file with 1000+ entries
2. **Expected Result**:
   - Lazy loading should make initial view fast
   - Groups should load quickly when opened
   - No browser freezing or lag

### Performance Test 2: Many Request IDs
1. **Action**: Upload logs with 100+ unique request IDs
2. **Expected Result**:
   - Initial list should render quickly
   - Each group should load independently
   - Scrolling should be smooth

## Error Handling

### Error Test 1: Network Failure
1. **Action**: Simulate network failure while loading a request group
2. **Expected Result**: Should show appropriate error message

### Error Test 2: Invalid Log Format
1. **Action**: Upload an invalid log file
2. **Expected Result**: Should show error message without crashing

## Visual Regression

Check that:
- [ ] Button styles are consistent across the application
- [ ] Colors match existing design system
- [ ] Spacing and margins are appropriate
- [ ] Icons (📋) render correctly
- [ ] Warning emoji (⚠️) displays properly
- [ ] Loading states are visually clear
