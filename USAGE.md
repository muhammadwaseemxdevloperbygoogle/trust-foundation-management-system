# Waqf Trust Foundation - Record Management System

## Overview

This application is a comprehensive record management system designed for Waqf Trust Foundations to manage their properties, beneficiaries, financial transactions, and administrative tasks.

---

## Getting Started

### Demo Credentials

| Role     | Email                | Password   | Access Level |
|----------|----------------------|------------|--------------|
| Admin    | admin@waqf.org       | admin123   | Full access to all features |
| Trustee  | trustee@waqf.org     | trustee123 | Property and beneficiary management |
| Auditor  | auditor@waqf.org     | auditor123 | Read-only access with audit logs |
| Viewer   | viewer@waqf.org      | viewer123  | Read-only access |

### Login

1. Navigate to the login page (root URL)
2. Enter your email and password
3. Click "Sign In" to access the dashboard

---

## Dashboard

The main dashboard provides an overview of:

- **Total Properties** - Count of all Waqf properties in the system
- **Active Beneficiaries** - Number of beneficiaries currently receiving support
- **Monthly Revenue** - Total income from all properties this month
- **Pending Actions** - Tasks requiring attention

### Quick Actions (Admin/Trustee only)
- Add New Property
- Register Beneficiary
- Record Transaction
- Generate Report

### Recent Activity
View the latest actions performed in the system including property additions, beneficiary registrations, and transactions.

---

## Properties Management

### Viewing Properties
Navigate to **Properties** in the sidebar to see all Waqf properties.

**Features:**
- Search properties by name, location, or ID
- Filter by property type (Residential, Commercial, Agricultural, Mixed-Use, Religious)
- Filter by status (Active, Under Maintenance, Disputed, Inactive)
- Sort by any column

### Property Details
Click on any property row to view detailed information:

**Overview Tab:**
- Property description and key details
- Location and area information
- Current valuation and rental income
- Manager contact details

**Documents Tab:**
- Title deed and legal documents
- Lease agreements
- Maintenance records
- Upload new documents (Admin/Trustee only)

**Transactions Tab:**
- Complete financial history
- Income and expense records
- Filter by date range

**Beneficiaries Tab:**
- List of beneficiaries assigned to this property
- Share allocation details
- Add/remove beneficiaries (Admin/Trustee only)

**Audit Log Tab:**
- Complete history of all changes
- User actions with timestamps
- System events

### Adding a Property (Admin/Trustee only)
1. Click "Add Property" button
2. Fill in property details
3. Upload required documents
4. Submit for review

---

## Beneficiaries Management

### Viewing Beneficiaries
Navigate to **Beneficiaries** in the sidebar.

**Features:**
- Search by name, ID, or contact
- Filter by status (Active, Inactive, Pending)
- View allocation details

### Beneficiary Information
Each beneficiary record includes:
- Personal information (name, contact, address)
- Linked properties and share percentages
- Payment history
- Registration date

### Adding a Beneficiary (Admin/Trustee only)
1. Click "Add Beneficiary" button
2. Fill in personal details
3. Assign properties and share percentages
4. Submit registration

---

## Reports

Navigate to **Reports** to generate various reports.

### Available Report Types

| Report | Description |
|--------|-------------|
| Property Summary | Overview of all properties with valuations |
| Financial Statement | Income and expenses breakdown |
| Beneficiary Distribution | Allocation details per beneficiary |
| Transaction History | Detailed transaction records |
| Audit Report | System activity and changes |
| Annual Report | Comprehensive yearly summary |

### Generating Reports
1. Select report type
2. Choose date range (preset or custom)
3. Click "Generate Report"
4. Export as PDF, Excel, or CSV

---

## User Management (Admin only)

Navigate to **User Management** to manage system users.

### Features
- View all system users
- Add new users with role assignment
- Change user roles
- Deactivate user accounts
- View user activity logs

### User Roles

| Role | Permissions |
|------|-------------|
| Admin | Full system access, user management, all CRUD operations |
| Trustee | Property and beneficiary management, transactions, reports |
| Auditor | Read-only access to all data, audit logs, reports |
| Viewer | Read-only access to properties and beneficiaries |

### Inviting New Users
1. Click "Invite User" button
2. Enter user email and name
3. Select appropriate role
4. Send invitation

---

## Navigation

### Sidebar Menu
- **Dashboard** - Main overview
- **Properties** - Property management
- **Beneficiaries** - Beneficiary records
- **Reports** - Report generation
- **User Management** - Admin user controls (Admin only)

### Top Navigation
- **Search** - Global search across all records
- **Notifications** - System alerts and updates
- **User Menu** - Profile settings and logout

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus search |
| `Esc` | Close modal/panel |

---

## Support

For technical support or questions:
- Email: support@waqf.org
- Phone: +1 (555) 123-4567

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | April 2026 | Initial release |
