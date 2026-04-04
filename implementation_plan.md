# Branding Alignment: HRMSCore Auth Portal

This plan focuses on finalizing the naming conventions and professional terminology for the Unified Authentication Portal. Every label in this table is currently in the codebase; please edit the "Target Name" column with your preferred terminology.

## User Review Required: Portal Terminology

Please edit the **Target Name** in the table below. Once you approve this plan, I will propagate these exact names to the live environment.

| Component | Current Code Name | Target Name (Please Edit) |
| :--- | :--- | :--- |
| **Main Branding** | HRMSCore | **HRMSCore** |
| **App Versioning** | v2.2.1-stable | **v2.2.1-stable** |
| **Left Portal Title** | Enterprise Registration | **Registration Form** |
| **Section 1 Header** | Business Entity | **Business Entity** |
| **Section 2 Header** | Admin Credentials | **Admin Credentials** |
| **Section 3 Header** | Environment | **Environment** |
| **Left Action Button** | Complete Registration | **Complete Registration** |
| **Right Portal Title** | Identity Access Portal | **User Access Portal** |
| **Right Action Button** | Access Workspace | **Access Workspace** |
| **Footer Text** | HRMSCore Enterprise Suite | **HRMSCore v2.2.1** |
| **Workspace ID Field** | Workspace ID | **Workspace ID** |
| **Username Field** | User Identifier | **User Identifier** |
| **PIN Field** | Secure Access PIN | **Secure Access PIN** |

> [!IMPORTANT]
> I have also resolved the **"CREATEDAT"** technical error by migrating all properties to snake_case. These naming changes will be the final step to polishing the production portal.

## Proposed Changes

### Auth Portal Component
#### [MODIFY] [AuthPortal.tsx](file:///d:/Operation/TYS-HRMS/src/pages/AuthPortal.tsx)
-   Apply the finalized names from the table above.
-   Ensure Light Mode remains the absolute standard.
-   Maintain 100% data parity for state and industry segments.

## Verification Plan

### Manual Verification
1.  Deploy to Netlify.
2.  Provide a screenshot of the updated Branding to the User for final verification.
3.  Confirm successful registration on `hrmscorev2.netlify.app`.
