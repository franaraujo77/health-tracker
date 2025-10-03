package com.healthtracker.backend.security;

import com.healthtracker.backend.entity.User;
import com.healthtracker.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Collection;
import java.util.stream.Collectors;

/**
 * Custom UserDetailsService implementation for loading user-specific data
 * Integrates with Spring Security authentication
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPasswordHash(),
                getAuthorities(user.getRoles())
        );
    }

    /**
     * Convert user roles to Spring Security GrantedAuthority
     */
    private Collection<? extends GrantedAuthority> getAuthorities(String[] roles) {
        if (roles == null) {
            return Arrays.asList(new SimpleGrantedAuthority("ROLE_PATIENT"));
        }

        return Arrays.stream(roles)
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .collect(Collectors.toList());
    }
}
