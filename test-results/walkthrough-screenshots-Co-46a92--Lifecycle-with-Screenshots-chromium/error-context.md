# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - img [ref=e7]
      - heading "Welcome back" [level=3] [ref=e9]
      - paragraph [ref=e10]: Enter your credentials to access your Omari Finance account
    - generic [ref=e12]:
      - generic [ref=e13]:
        - text: Email
        - textbox "Email" [ref=e14]:
          - /placeholder: name@example.com
      - generic [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]: Password
          - link "Forgot password?" [ref=e18] [cursor=pointer]:
            - /url: /forgot-password
        - generic [ref=e19]:
          - textbox "Password" [ref=e20]
          - button [ref=e21]:
            - img [ref=e22]
      - button "Sign In" [ref=e25]
    - generic [ref=e27]:
      - text: Don't have an account?
      - link "Sign up" [ref=e28] [cursor=pointer]:
        - /url: /signup
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e34] [cursor=pointer]:
    - img [ref=e35]
  - alert [ref=e38]
```