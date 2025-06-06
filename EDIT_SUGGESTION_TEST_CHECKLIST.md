# Edit Suggestion Review Process - Test Checklist

## Prerequisites Setup

- [ ] Database has at least 3 approved playgrounds with different equipment configurations
- [ ] User accounts: 1 regular user, 1 admin user
- [ ] Test images uploaded and accessible
- [ ] Multiple equipment items available in different categories

## Test Environment Preparation

1. **Playground 1**: Has 5 equipment items, 3 images, cover image, public access
2. **Playground 2**: Has 0 equipment items, 1 image, no cover image, school ground
3. **Playground 3**: Has 10+ equipment items, maximum images, all amenities enabled

---

## 1. Equipment Change Testing

### 1.1 Equipment Addition Tests

- [ ] **Add 1 equipment item** to playground with existing equipment
- [ ] **Add multiple equipment items** (3-5) to playground with existing equipment
- [ ] **Add equipment to empty playground** (0 → multiple items)
- [ ] **Add equipment from different categories** simultaneously
- [ ] **Add duplicate equipment** that already exists on playground (should be prevented/handled gracefully)

### 1.2 Equipment Removal Tests

- [ ] **Remove 1 equipment item** from playground with multiple items
- [ ] **Remove multiple equipment items** (partial removal)
- [ ] **Remove ALL equipment items** (complete removal → 0 items)
- [ ] **Remove non-existent equipment** (should be handled gracefully)

### 1.3 Equipment Replacement Tests

- [ ] **Replace some equipment** (remove 2, add 3 different ones)
- [ ] **Complete equipment replacement** (remove all, add different set)
- [ ] **Mixed changes** (remove 2, add 1, keep 3 unchanged)

### 1.4 Equipment Review Interface Tests

- [ ] **Current Equipment section** shows all existing playground equipment correctly
- [ ] **Suggested Changes section** correctly shows additions (green badges) and removals (red badges)
- [ ] **Final Equipment List** initializes with suggested changes
- [ ] **Individual checkboxes** work for each equipment item
- [ ] **Equipment toggles** update counts and visual states correctly
- [ ] **Reviewer can override** suggested equipment (approve some, reject others)
- [ ] **Empty states** display correctly when no equipment exists/suggested

---

## 2. Image Review Testing

### 2.1 Cover Image Tests

- [ ] **New cover image** approval/rejection works
- [ ] **Cover image replacement** (original exists, new one suggested)
- [ ] **First-time cover image** (no original cover image)
- [ ] **Visual feedback** (opacity, checkmarks) works correctly
- [ ] **State persistence** when toggling approval multiple times

### 2.2 Additional Images Tests

- [ ] **Single additional image** approval/rejection
- [ ] **Multiple additional images** (2-5) with individual controls
- [ ] **Batch approval/rejection** by clicking multiple images
- [ ] **Mixed approval** (approve some, reject others)
- [ ] **Counter accuracy** (X/Y approved counter updates correctly)
- [ ] **Empty state** when no additional images suggested

### 2.3 Image Filtering Tests

- [ ] **Only new images show** (existing images not displayed for approval)
- [ ] **Duplicate image handling** (if same image uploaded twice)
- [ ] **Invalid image URLs** handled gracefully
- [ ] **Large number of images** (test with maximum allowed)

---

## 3. Field Change Testing

### 3.1 Basic Information Changes

- [ ] **Title change** approval with editable final value
- [ ] **Municipality change** with proper text input
- [ ] **Title + Municipality** simultaneous changes
- [ ] **Special characters** in title/municipality
- [ ] **Empty/null municipality** handling

### 3.2 Boolean Field Changes

- [ ] **Single boolean change** (publiclyAccessible, toddlerFriendly, etc.)
- [ ] **Multiple boolean changes** simultaneously
- [ ] **All amenity changes** at once (hasSeating, hasPicnicTable, etc.)
- [ ] **School ground status** changes with schoolType dependencies
- [ ] **Boolean field editor** (checkboxes) work correctly

### 3.3 Location Changes

- [ ] **Latitude only** change
- [ ] **Longitude only** change
- [ ] **Both coordinates** change
- [ ] **Maps display** correctly (original vs proposed)
- [ ] **Coordinate validation** (valid lat/lng ranges)
- [ ] **Extreme coordinates** (edge of map boundaries)

### 3.4 School Ground Changes

- [ ] **isSchoolGround** true → false
- [ ] **isSchoolGround** false → true
- [ ] **schoolType** changes with dropdown
- [ ] **schoolType** set to null when isSchoolGround becomes false
- [ ] **Select component** validation (no empty string values)

---

## 4. Complex Scenario Testing

### 4.1 Multiple Change Types

- [ ] **All field types** changed in single suggestion (title, location, equipment, images, booleans)
- [ ] **Equipment + Images** changes together
- [ ] **Location + School Ground** changes together
- [ ] **Maximum complexity** (change every possible field)

### 4.2 Edge Cases

- [ ] **Empty suggestion** (no actual changes detected)
- [ ] **Identical values** (suggested value same as original)
- [ ] **Null vs empty** value handling
- [ ] **Unicode characters** in text fields
- [ ] **Very long text** values (approaching field limits)

### 4.3 State Management

- [ ] **Dialog state resets** properly when closed/reopened
- [ ] **Image approval state** persists during review
- [ ] **Equipment selection state** persists during review
- [ ] **Final values state** maintains changes correctly
- [ ] **Multiple dialogs** (close one, open another) maintain separate states

---

## 5. Review Actions Testing

### 5.1 Approval Process

- [ ] **Approve with default values** (no reviewer changes)
- [ ] **Approve with reviewer modifications** (changed final values)
- [ ] **Approve with partial image rejection**
- [ ] **Approve with equipment modifications**
- [ ] **Approve with all modifications** (complex case)

### 5.2 Rejection Process

- [ ] **Reject without reason** (should be prevented)
- [ ] **Reject with short reason** (minimum validation)
- [ ] **Reject with long reason** (maximum validation)
- [ ] **Reject with special characters** in reason
- [ ] **Cancel rejection** (back button functionality)

### 5.3 Backend Integration

- [ ] **Approved changes applied** to original playground correctly
- [ ] **Equipment changes** saved to database properly
- [ ] **Image changes** applied correctly (cover + additional)
- [ ] **All field changes** persisted accurately
- [ ] **Edit suggestion status** updated to "approved"/"rejected"
- [ ] **Review metadata** saved (reviewer, timestamp, reason)

---

## 6. Data Integrity Testing

### 6.1 Database Consistency

- [ ] **Equipment relationships** maintained correctly after approval
- [ ] **Image arrays** updated without data loss
- [ ] **Playground status** remains "approved" after changes
- [ ] **Playground metadata** (updatedAt, etc.) updated correctly
- [ ] **Foreign key constraints** maintained

### 6.2 Rollback Scenarios

- [ ] **Approval fails** - suggestion remains pending
- [ ] **Partial data corruption** - changes not applied
- [ ] **Network interruption** during approval
- [ ] **Database transaction** rollback on error

---

## 7. UI/UX Testing

### 7.1 Visual Feedback

- [ ] **Loading states** during approval/rejection
- [ ] **Success/error messages** display correctly
- [ ] **Visual indicators** (green checkmarks, red X's) work
- [ ] **Disabled states** during processing
- [ ] **Progress indication** for long operations

### 7.2 Responsiveness

- [ ] **Mobile view** works correctly
- [ ] **Tablet view** layouts properly
- [ ] **Desktop view** optimal spacing
- [ ] **Image grids** responsive on all screen sizes
- [ ] **Equipment selector** usable on small screens

### 7.3 Accessibility

- [ ] **Keyboard navigation** through all interactive elements
- [ ] **Screen reader** compatibility
- [ ] **Color contrast** sufficient for approval/rejection indicators
- [ ] **Focus states** visible and logical
- [ ] **ARIA labels** for image approval buttons

---

## 8. Performance Testing

### 8.1 Large Data Sets

- [ ] **Review suggestion** with maximum equipment items (20+)
- [ ] **Review suggestion** with maximum images (8)
- [ ] **Complex equipment changes** (many additions/removals)
- [ ] **Large text fields** (long titles, descriptions)

### 8.2 Network Conditions

- [ ] **Slow network** approval process
- [ ] **Network timeout** handling
- [ ] **Offline/online** state changes
- [ ] **Large image** loading performance

---

## 9. Cross-Browser Testing

### 9.1 Browser Compatibility

- [ ] **Chrome** (latest)
- [ ] **Firefox** (latest)
- [ ] **Safari** (latest)
- [ ] **Edge** (latest)
- [ ] **Mobile browsers** (iOS Safari, Chrome Mobile)

### 9.2 Browser-Specific Features

- [ ] **Image upload** works in all browsers
- [ ] **Checkbox interactions** consistent
- [ ] **CSS transitions** work properly
- [ ] **JavaScript state management** compatible

---

## 10. Internationalization Testing

### 10.1 Language Switching

- [ ] **English** interface complete and accurate
- [ ] **Icelandic** interface complete and accurate
- [ ] **Polish** interface complete and accurate
- [ ] **Language switching** during review process
- [ ] **Special characters** in non-English languages

### 10.2 Text Overflow

- [ ] **Long translations** don't break layout
- [ ] **Text truncation** handled gracefully
- [ ] **Button text** fits in different languages
- [ ] **RTL languages** (if supported) work correctly

---

## Priority Test Cases (Critical Path)

1. **Equipment Addition + Approval** - Add 3 equipment items, approve with modifications
2. **Equipment Removal + Approval** - Remove 2 equipment items, approve as suggested
3. **Image Review + Partial Approval** - 4 images suggested, approve 2, reject 2
4. **Complex Mixed Changes** - Change title, location, equipment, images simultaneously
5. **Rejection with Reason** - Reject suggestion with detailed reason
6. **Empty Equipment Playground** - Add equipment to playground with no existing equipment
7. **Complete Equipment Replacement** - Remove all, add different set
8. **Maximum Complexity** - Change every possible field type in one suggestion

---

## Automated Testing Recommendations

### Unit Tests

- [ ] Equipment state management functions
- [ ] Image approval/rejection logic
- [ ] Final values calculation
- [ ] Change detection algorithms

### Integration Tests

- [ ] Database operations (equipment relationships)
- [ ] tRPC mutation handling
- [ ] State synchronization between components

### E2E Tests

- [ ] Complete approval workflow
- [ ] Complete rejection workflow
- [ ] Equipment modification scenarios
- [ ] Image review scenarios

---

## Post-Testing Verification

After completing all tests, verify:

- [ ] **No data corruption** in any playground records
- [ ] **Performance metrics** within acceptable ranges
- [ ] **User experience** smooth and intuitive
- [ ] **Error handling** graceful and informative
- [ ] **Database consistency** maintained throughout
